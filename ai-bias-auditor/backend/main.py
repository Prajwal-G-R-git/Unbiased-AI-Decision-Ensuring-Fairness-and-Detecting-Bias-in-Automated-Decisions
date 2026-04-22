from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import json

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder

# Import Fairlearn metrics and mitigation algorithms
from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference, demographic_parity_ratio
from fairlearn.postprocessing import ThresholdOptimizer

app = FastAPI(title="AI Bias Auditor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/analyze")
async def analyze_data(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_attributes: str = Form(...) 
):
    try:
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
                warnings.append({
                    "type": "Low Data Quality",
                    "severity": "medium",
                    "message": f"Column '{col}' has {missing_pct:.1%} missing values."
                })

        target_counts = df[target_column].value_counts()
        target_props = df[target_column].value_counts(normalize=True)
        
        class_imbalance_detected = False
        if len(target_props) >= 2:
            min_class_prop = target_props.min()
            if min_class_prop < 0.20:
                class_imbalance_detected = True
                warnings.append({
                    "type": "Skewed Distribution",
                    "severity": "high",
                    "message": f"Severe target class imbalance detected. Minority class is only {min_class_prop:.1%} of data."
                })

        group_imbalances = {}
        sensitive_groups_data = {}
        
        for col in sensitive_cols:
            counts = df[col].value_counts().to_dict()
            props = df[col].value_counts(normalize=True).to_dict()
            sensitive_groups_data[col] = {
                "counts": counts,
                "proportions": props
            }
            
            min_group_prop = min(props.values())
            is_imbalanced = min_group_prop < 0.20
            group_imbalances[col] = {
                "detected": is_imbalanced,
                "metric": min_group_prop,
                "note": f"Smallest group in {col} is only {min_group_prop:.1%} of the dataset." if is_imbalanced else "Balanced."
            }
            if is_imbalanced:
                warnings.append({
                    "type": "Group Imbalance",
                    "severity": "medium",
                    "message": f"Sensitive attribute '{col}' has a highly underrepresented group ({min_group_prop:.1%})."
                })

        response = {
            "dataset_summary": {
                "total_rows": total_rows,
                "total_columns": len(df.columns),
                "missing_values": missing_values
            },
            "distributions": {
                "target_class": {
                    "column": target_column,
                    "counts": target_counts.to_dict(),
                    "proportions": target_props.to_dict()
                },
                "sensitive_groups": sensitive_groups_data
            },
            "bias_detection": {
                "class_imbalance": {
                    "detected": class_imbalance_detected
                },
                "group_imbalance": group_imbalances
            },
            "warnings": warnings
        }
        
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/train")
async def train_model(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_attributes: str = Form(...), 
    model_type: str = Form(...) 
):
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        df = df.dropna()
        sensitive_cols = json.loads(sensitive_attributes)
        
        A = df[sensitive_cols].copy()
        
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column])
        
        features_to_encode = df.drop(columns=[target_column] + sensitive_cols)
        X = pd.get_dummies(features_to_encode)
        y = df[target_column]
        
        X_train, X_test, y_train, y_test, A_train, A_test = train_test_split(
            X, y, A, test_size=0.2, random_state=42, stratify=y
        )
        
        if model_type == 'logistic_regression':
            model = LogisticRegression(max_iter=1000, random_state=42)
        elif model_type == 'decision_tree':
            model = DecisionTreeClassifier(random_state=42)
        else:
            raise HTTPException(status_code=400, detail="Unsupported model type.")
            
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        predictions_data = []
        for i, idx in enumerate(y_test.index):
            record = {
                "actual": int(y_test.iloc[i]),
                "predicted": int(y_pred[i]),
                "sensitive_attributes": A_test.iloc[i].to_dict()
            }
            predictions_data.append(record)

        return {
            "model_type": model_type,
            "target_classes": le.classes_.tolist(),
            "metrics": {
                "accuracy": round(acc, 4),
                "confusion_matrix": cm
            },
            "predictions_preview": predictions_data[:100] 
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/mitigate")
async def mitigate_bias(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_attribute: str = Form(...), 
    model_type: str = Form(...) 
):
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        df = df.dropna()
        
        A = df[sensitive_attribute]
        
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column])
        
        features_to_encode = df.drop(columns=[target_column, sensitive_attribute])
        X = pd.get_dummies(features_to_encode)
        y = df[target_column]
        
        X_train, X_test, y_train, y_test, A_train, A_test = train_test_split(
            X, y, A, test_size=0.2, random_state=42, stratify=y
        )
        
        if model_type == 'logistic_regression':
            base_model = LogisticRegression(max_iter=1000, random_state=42)
        else:
            base_model = DecisionTreeClassifier(random_state=42)
            
        base_model.fit(X_train, y_train)
        base_preds = base_model.predict(X_test)
        base_acc = accuracy_score(y_test, base_preds)
        base_dp = demographic_parity_difference(y_test, base_preds, sensitive_features=A_test)

        mitigator = ThresholdOptimizer(
            estimator=base_model, 
            constraints="demographic_parity", 
            predict_method="predict"
        )
        mitigator.fit(X_train, y_train, sensitive_features=A_train)
        
        mitigated_preds = mitigator.predict(X_test, sensitive_features=A_test)
        mit_acc = accuracy_score(y_test, mitigated_preds)
        mit_dp = demographic_parity_difference(y_test, mitigated_preds, sensitive_features=A_test)

        return {
            "baseline_model": {
                "accuracy": round(base_acc, 4),
                "demographic_parity_difference": round(base_dp, 4),
                "is_fair": base_dp < 0.1
            },
            "mitigated_model": {
                "accuracy": round(mit_acc, 4),
                "demographic_parity_difference": round(mit_dp, 4),
                "is_fair": mit_dp < 0.1
            },
            "summary": {
                "accuracy_change": round(mit_acc - base_acc, 4),
                "bias_reduction": round(base_dp - mit_dp, 4)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/fairness-engine")
async def evaluate_fairness(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_attribute: str = Form(...)
):
    try:
        # 1. Load Data
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        df = df.dropna()
        A = df[sensitive_attribute]
        
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column])
        
        features_to_encode = df.drop(columns=[target_column, sensitive_attribute])
        X = pd.get_dummies(features_to_encode)
        y = df[target_column]
        
        X_train, X_test, y_train, y_test, A_train, A_test = train_test_split(
            X, y, A, test_size=0.2, random_state=42, stratify=y
        )
        
        # 2. Train Standard Model for Evaluation
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        # 3. Compute Deep Fairness Metrics
        dpd = demographic_parity_difference(y_test, y_pred, sensitive_features=A_test)
        eod = equalized_odds_difference(y_test, y_pred, sensitive_features=A_test)
        
        # Handle division by zero for ratio
        try:
            dir_val = demographic_parity_ratio(y_test, y_pred, sensitive_features=A_test)
        except ValueError:
            dir_val = 0.0

        # 4. Compute Fairness Score (0-100)
        # We penalize the score based on the highest difference metric (DPD or EOD)
        # A difference of 0 is a perfect 100 score. A difference of 1.0 (max bias) is a 0 score.
        max_disparity = max(dpd, eod)
        raw_score = 100 - (max_disparity * 100)
        score = max(0, min(100, raw_score)) # Clamp between 0 and 100

        # 5. Determine Risk Level
        if score >= 85:
            severity = "Low"
            explanation = "This model demonstrates low levels of bias across the measured groups. It is generally safe for deployment regarding this attribute."
        elif score >= 60:
            severity = "Medium"
            explanation = "This model shows moderate bias. Certain groups are favored over others. Consider applying the Mitigation Module before using this in production."
        else:
            severity = "High"
            explanation = "CRITICAL: This model exhibits severe bias and heavily discriminates against specific groups. Do not deploy without strict algorithmic intervention."

        return {
            "metrics": {
                "demographic_parity_difference": {
                    "value": round(dpd, 4),
                    "interpretation": "Measures the gap in positive prediction rates between groups. A value of 0 indicates perfect fairness. Yours is " + str(round(dpd, 4)) + "."
                },
                "equal_opportunity_difference": {
                    "value": round(eod, 4),
                    "interpretation": "Measures the gap in true positive rates (correctly predicting the positive class). A value of 0 means the model is equally accurate for all groups."
                },
                "disparate_impact_ratio": {
                    "value": round(dir_val, 4),
                    "interpretation": "The ratio of selection rates between unprivileged and privileged groups. A value of 1.0 is perfectly fair. US regulatory guidelines often flag values below 0.8."
                }
            },
            "score": round(score, 1),
            "risk_level": severity,
            "human_readable_explanation": explanation
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)