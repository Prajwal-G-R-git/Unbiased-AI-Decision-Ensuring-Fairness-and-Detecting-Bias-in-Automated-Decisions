from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from typing import List
import pandas as pd
import io
import json
import numpy as np
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler

from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference, demographic_parity_ratio
from fairlearn.postprocessing import ThresholdOptimizer
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

app = FastAPI(title="AI Bias Auditor API - Enterprise Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ENTERPRISE FEATURE: AUDIT LOGGING
# ==========================================
SYSTEM_LOGS = []

def log_action(action: str, details: str):
    SYSTEM_LOGS.append({
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "action": action,
        "details": details
    })

# --- HELPER FUNCTION ---
def get_model(model_type):
    if model_type == 'logistic_regression':
        return LogisticRegression(max_iter=1000, random_state=42)
    return DecisionTreeClassifier(random_state=42)


# ==========================================
# CHUNK 1: DATA ANALYSIS ENDPOINT
# ==========================================
@app.post("/api/v1/analyze")
async def analyze_data(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_attributes: str = Form(...) 
):
    try:
        log_action("Analyze Data", f"Analyzed file {file.filename} for target {target_column}")
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")
            
        sensitive_cols = json.loads(sensitive_attributes)
        warnings = []
        
        if target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found.")
        for col in sensitive_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Sensitive column '{col}' not found.")

        total_rows = len(df)
        missing_values = df.isnull().sum().to_dict()
        
        for col, missing_count in missing_values.items():
            missing_pct = missing_count / total_rows
            if missing_pct > 0.05:
                warnings.append({"type": "Low Data Quality", "severity": "medium", "message": f"Column '{col}' has {missing_pct:.1%} missing values."})

        target_counts = df[target_column].value_counts()
        target_props = df[target_column].value_counts(normalize=True)
        
        class_imbalance_detected = False
        if len(target_props) >= 2:
            min_class_prop = target_props.min()
            if min_class_prop < 0.20:
                class_imbalance_detected = True
                warnings.append({"type": "Skewed Distribution", "severity": "high", "message": f"Severe target class imbalance detected. Minority class is only {min_class_prop:.1%} of data."})

        group_imbalances = {}
        sensitive_groups_data = {}
        
        for col in sensitive_cols:
            counts = df[col].value_counts().to_dict()
            props = df[col].value_counts(normalize=True).to_dict()
            sensitive_groups_data[col] = {"counts": counts, "proportions": props}
            
            min_group_prop = min(props.values())
            is_imbalanced = min_group_prop < 0.20
            group_imbalances[col] = {
                "detected": is_imbalanced,
                "metric": min_group_prop,
                "note": f"Smallest group in {col} is only {min_group_prop:.1%} of the dataset." if is_imbalanced else "Balanced."
            }
            if is_imbalanced:
                warnings.append({"type": "Group Imbalance", "severity": "medium", "message": f"Sensitive attribute '{col}' has a highly underrepresented group ({min_group_prop:.1%})."})

        return {
            "dataset_summary": {"total_rows": total_rows, "total_columns": len(df.columns), "missing_values": missing_values},
            "distributions": {"target_class": {"column": target_column, "counts": target_counts.to_dict(), "proportions": target_props.to_dict()}, "sensitive_groups": sensitive_groups_data},
            "bias_detection": {"class_imbalance": {"detected": class_imbalance_detected}, "group_imbalance": group_imbalances},
            "warnings": warnings
        }

    except Exception as e:
        log_action("Error: Analyze Data", str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# CHUNK 2 & 3: MODEL TRAINING & AUTO-SELECTION
# ==========================================
@app.post("/api/v1/train")
async def train_model(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_attributes: str = Form(...), 
    model_type: str = Form(...) # Now supports 'auto'
):
    try:
        log_action("Train Model", f"Training {model_type} on {file.filename}")
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
        df = df.dropna()
        sensitive_cols = json.loads(sensitive_attributes)
        
        A = df[sensitive_cols].copy()
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column])
        
        X = pd.get_dummies(df.drop(columns=[target_column] + sensitive_cols))
        y = df[target_column]
        X_train, X_test, y_train, y_test, A_train, A_test = train_test_split(X, y, A, test_size=0.2, random_state=42, stratify=y)
        
        # ENTERPRISE FEATURE: AUTO MODEL SELECTION
        models_to_test = ['logistic_regression', 'decision_tree'] if model_type == 'auto' else [model_type]
        best_model_name = ""
        best_acc = 0
        best_cm = []
        best_preds = []
        
        for m_type in models_to_test:
            model = get_model(m_type)
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            acc = accuracy_score(y_test, y_pred)
            
            # If auto, we pick the one with the highest accuracy for the baseline preview
            if acc > best_acc:
                best_acc = acc
                best_model_name = m_type
                best_cm = confusion_matrix(y_test, y_pred).tolist()
                best_preds = y_pred

        predictions_data = []
        for i, idx in enumerate(y_test.index):
            predictions_data.append({
                "actual": int(y_test.iloc[i]),
                "predicted": int(best_preds[i]),
                "sensitive_attributes": A_test.iloc[i].to_dict()
            })

        log_action("Auto-Selection Complete", f"Selected {best_model_name} with accuracy {round(best_acc, 4)}")

        return {
            "model_type": best_model_name,
            "target_classes": le.classes_.tolist(),
            "metrics": {"accuracy": round(best_acc, 4), "confusion_matrix": best_cm},
            "predictions_preview": predictions_data[:100] 
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# CHUNK 4: FAIRNESS ENGINE ENDPOINT
# ==========================================
@app.post("/api/v1/fairness-engine")
async def evaluate_fairness(file: UploadFile = File(...), target_column: str = Form(...), sensitive_attribute: str = Form(...)):
    try:
        log_action("Evaluate Fairness", f"Evaluating {sensitive_attribute} against {target_column}")
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
        df = df.dropna()
        A = df[sensitive_attribute]
        
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column])
        X = pd.get_dummies(df.drop(columns=[target_column, sensitive_attribute]))
        y = df[target_column]
        
        X_train, X_test, y_train, y_test, A_train, A_test = train_test_split(X, y, A, test_size=0.2, random_state=42, stratify=y)
        
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        dpd = demographic_parity_difference(y_test, y_pred, sensitive_features=A_test)
        eod = equalized_odds_difference(y_test, y_pred, sensitive_features=A_test)
        try:
            dir_val = demographic_parity_ratio(y_test, y_pred, sensitive_features=A_test)
        except:
            dir_val = 0.0

        max_disparity = max(dpd, eod)
        raw_score = 100 - (max_disparity * 100)
        score = max(0, min(100, raw_score)) 

        if score >= 85:
            severity = "Low"
            explanation = "This model demonstrates low levels of bias across the measured groups. Safe for deployment."
        elif score >= 60:
            severity = "Medium"
            explanation = "This model shows moderate bias. Consider applying the Mitigation Module before using this in production."
        else:
            severity = "High"
            explanation = "CRITICAL: This model exhibits severe bias. Do not deploy without strict algorithmic intervention."

        return {
            "metrics": {
                "demographic_parity_difference": {"value": round(dpd, 4), "interpretation": "Gap in positive prediction rates."},
                "equal_opportunity_difference": {"value": round(eod, 4), "interpretation": "Gap in true positive rates."},
                "disparate_impact_ratio": {"value": round(dir_val, 4), "interpretation": "Ratio of selection rates."}
            },
            "score": round(score, 1),
            "risk_level": severity,
            "human_readable_explanation": explanation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# CHUNK 6: BIAS MITIGATION ENDPOINT
# ==========================================
@app.post("/api/v1/mitigate")
async def mitigate_bias(file: UploadFile = File(...), target_column: str = Form(...), sensitive_attribute: str = Form(...), model_type: str = Form(...), technique: str = Form(...) ):
    try:
        log_action("Bias Mitigation", f"Applied {technique} to {file.filename}")
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
        df = df.dropna()
        
        A = df[sensitive_attribute]
        le = LabelEncoder()
        y = le.fit_transform(df[target_column])
        
        X_base = pd.get_dummies(df.drop(columns=[target_column]))
        X_tr, X_te, y_tr, y_te, A_tr, A_te = train_test_split(X_base, y, A, test_size=0.2, random_state=42, stratify=y)
        
        base_model = get_model(model_type)
        base_model.fit(X_tr, y_tr)
        base_preds = base_model.predict(X_te)
        base_acc = accuracy_score(y_te, base_preds)
        base_dp = demographic_parity_difference(y_te, base_preds, sensitive_features=A_te)

        mit_acc, mit_dp = 0, 0
        if technique == 'remove_features':
            X_mit = pd.get_dummies(df.drop(columns=[target_column, sensitive_attribute]))
            X_tr_m, X_te_m, y_tr_m, y_te_m, A_tr_m, A_te_m = train_test_split(X_mit, y, A, test_size=0.2, random_state=42, stratify=y)
            mit_model = get_model(model_type)
            mit_model.fit(X_tr_m, y_tr_m)
            m_preds = mit_model.predict(X_te_m)
            mit_acc, mit_dp = accuracy_score(y_te_m, m_preds), demographic_parity_difference(y_te_m, m_preds, sensitive_features=A_te_m)
        elif technique == 'reweighing':
            counts = df[sensitive_attribute].value_counts()
            weights = df[sensitive_attribute].map(lambda x: (len(df)/2) / counts[x])
            X_tr_m, X_te_m, y_tr_m, y_te_m, W_tr, A_te_m = train_test_split(X_base, y, weights, A, test_size=0.2, random_state=42, stratify=y)
            mit_model = get_model(model_type)
            mit_model.fit(X_tr_m, y_tr_m, sample_weight=W_tr)
            m_preds = mit_model.predict(X_te_m)
            mit_acc, mit_dp = accuracy_score(y_te_m, m_preds), demographic_parity_difference(y_te_m, m_preds, sensitive_features=A_te_m)
        elif technique == 'threshold_adjustment':
            mitigator = ThresholdOptimizer(estimator=base_model, constraints="demographic_parity", predict_method="predict")
            mitigator.fit(X_tr, y_tr, sensitive_features=A_tr)
            m_preds = mitigator.predict(X_te, sensitive_features=A_te)
            mit_acc, mit_dp = accuracy_score(y_te, m_preds), demographic_parity_difference(y_te, m_preds, sensitive_features=A_te)

        return {
            "before": {"accuracy": round(base_acc, 4), "bias": round(base_dp, 4)},
            "after": {"accuracy": round(mit_acc, 4), "bias": round(mit_dp, 4)},
            "improvement": {"bias_reduced": round(base_dp - mit_dp, 4), "accuracy_lost": round(base_acc - mit_acc, 4)}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# CHUNK 7: WHAT-IF SIMULATOR ENDPOINT
# ==========================================
@app.post("/api/v1/simulate")
async def simulate_what_if(file: UploadFile = File(...), target_column: str = Form(...), sensitive_attribute: str = Form(...), model_type: str = Form(...), removed_features: str = Form("[]"), rebalance: bool = Form(False), threshold: float = Form(0.5)):
    try:
        log_action("What-If Simulator", f"Threshold: {threshold}, Rebalance: {rebalance}")
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
        df = df.dropna()
        A = df[sensitive_attribute]
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column])
        y = df[target_column]

        X_base = pd.get_dummies(df.drop(columns=[target_column, sensitive_attribute]))
        X_tr_b, X_te_b, y_tr_b, y_te_b, A_tr_b, A_te_b = train_test_split(X_base, y, A, test_size=0.2, random_state=42, stratify=y)
        
        base_model = get_model(model_type)
        base_model.fit(X_tr_b, y_tr_b)
        base_preds = base_model.predict(X_te_b)
        base_dp = demographic_parity_difference(y_te_b, base_preds, sensitive_features=A_te_b)
        base_score = max(0, min(100, 100 - (base_dp * 100)))

        drop_list = [target_column, sensitive_attribute] + json.loads(removed_features)
        existing_drops = [col for col in drop_list if col in df.columns]
        
        X_sim = pd.get_dummies(df.drop(columns=existing_drops))
        X_tr_s, X_te_s, y_tr_s, y_te_s, A_tr_s, A_te_s = train_test_split(X_sim, y, A, test_size=0.2, random_state=42, stratify=y)

        sim_model = get_model(model_type)
        if rebalance:
            counts = A_tr_s.value_counts()
            weights = A_tr_s.map(lambda x: (len(A_tr_s)/len(counts)) / counts[x])
            sim_model.fit(X_tr_s, y_tr_s, sample_weight=weights)
        else:
            sim_model.fit(X_tr_s, y_tr_s)

        probs = sim_model.predict_proba(X_te_s)[:, 1] 
        sim_preds = (probs >= threshold).astype(int)

        sim_acc = accuracy_score(y_te_s, sim_preds)
        sim_dp = demographic_parity_difference(y_te_s, sim_preds, sensitive_features=A_te_s)
        sim_score = max(0, min(100, 100 - (sim_dp * 100)))

        return {
            "baseline": {"score": round(base_score, 1), "bias": round(base_dp, 4)},
            "simulation": {"score": round(sim_score, 1), "bias": round(sim_dp, 4), "accuracy": round(sim_acc, 4)},
            "impact": {"bias_change_pct": round(((base_dp - sim_dp) / base_dp) * 100 if base_dp > 0 else 0.0, 1)}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# CHUNK 8 & 9: XAI & PROXIES 
# ==========================================
@app.post("/api/v1/explain")
async def explain_model(file: UploadFile = File(...), target_column: str = Form(...), sensitive_attribute: str = Form(...), model_type: str = Form(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
        df = df.dropna()
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column])
        y = df[target_column]
        X = pd.get_dummies(df.drop(columns=[target_column]))
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        if model_type == 'logistic_regression':
            scaler = StandardScaler()
            model = LogisticRegression(max_iter=1000, random_state=42)
            model.fit(scaler.fit_transform(X_train), y_train)
            importances = np.abs(model.coef_[0])
        else:
            model = DecisionTreeClassifier(random_state=42)
            model.fit(X_train, y_train)
            importances = model.feature_importances_

        feature_importance_dict = dict(zip(X.columns.tolist(), importances))
        top_10 = sorted(feature_importance_dict.items(), key=lambda item: item[1], reverse=True)[:10]
        
        sensitive_flagged = any(sensitive_attribute in feat for feat, imp in top_10)
        return {
            "model_used": model_type,
            "top_features": {"labels": [f[0] for f in top_10], "values": [round(float(f[1]), 4) for f in top_10]},
            "explanation": {"sensitive_flagged": sensitive_flagged, "message": f"Feature '{top_10[0][0]}' is the primary driver."}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/proxies")
async def detect_proxies(file: UploadFile = File(...), target_column: str = Form(...), sensitive_attribute: str = Form(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
        df = df.dropna()
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = LabelEncoder().fit_transform(df[col])

        corr_matrix = df.corr().abs()
        sensitive_corr = corr_matrix[sensitive_attribute].drop([sensitive_attribute, target_column]).sort_values(ascending=False)

        flagged = [{"feature": f, "correlation_score": round(s, 3)} for f, s in zip(sensitive_corr.index, sensitive_corr.values) if s > 0.4]
        return {"features": sensitive_corr.index.tolist()[:15], "correlation_scores": [round(s, 3) for s in sensitive_corr.values[:15]], "flagged_proxies": flagged}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# CHUNK 10: REPORT GENERATION ENDPOINT
# ==========================================
@app.post("/api/v1/report")
async def generate_pdf_report(file: UploadFile = File(...), target_column: str = Form(...), sensitive_attribute: str = Form(...)):
    try:
        log_action("Generate PDF", f"PDF Exported for {file.filename}")
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
        df = df.dropna()
        A = df[sensitive_attribute]
        df[target_column] = LabelEncoder().fit_transform(df[target_column])
        X = pd.get_dummies(df.drop(columns=[target_column, sensitive_attribute]))
        X_tr, X_te, y_tr, y_te, A_tr, A_te = train_test_split(X, df[target_column], A, test_size=0.2, random_state=42, stratify=df[target_column])
        
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X_tr, y_tr)
        y_pred = model.predict(X_te)
        
        dpd = round(demographic_parity_difference(y_te, y_pred, sensitive_features=A_te), 4)
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = [Paragraph("AI Bias Auditor: Official Evaluation Report", styles['Heading1']), Spacer(1, 20), Paragraph(f"Calculated Demographic Parity Difference: {dpd}", styles['Normal'])]
        doc.build(elements)
        return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=AI_Bias_Report.pdf"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENTERPRISE NEW ENDPOINTS: BATCH, EXPORT & LOGS
# ==========================================

@app.get("/api/v1/logs")
async def get_audit_logs():
    return {"logs": list(reversed(SYSTEM_LOGS))[:50]} # Return latest 50 logs

@app.post("/api/v1/batch-analyze")
async def batch_analyze(files: List[UploadFile] = File(...)):
    log_action("Batch Process", f"Processed {len(files)} datasets")
    results = []
    for file in files:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        results.append({"filename": file.filename, "rows": len(df), "columns": len(df.columns)})
    return {"batch_results": results}

@app.post("/api/v1/export-csv")
async def export_csv(file: UploadFile = File(...), target_column: str = Form(...)):
    log_action("Export CSV", f"Exported predictions for {file.filename}")
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    df = df.dropna()
    
    # Train dummy model just to generate output CSV quickly for enterprise demo
    y = LabelEncoder().fit_transform(df[target_column])
    X = pd.get_dummies(df.drop(columns=[target_column]))
    model = DecisionTreeClassifier(random_state=42)
    model.fit(X, y)
    df['Auditor_Predicted_Label'] = model.predict(X)

    output = io.StringIO()
    df.to_csv(output, index=False)
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=Audited_Dataset.csv"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)