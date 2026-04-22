from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import json

app = FastAPI(title="AI Bias Auditor API")

# Allow React frontend to communicate with this API
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
    sensitive_attributes: str = Form(...) # Expecting JSON string array, e.g., '["gender", "race"]'
):
    try:
        # 1. Read the file
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")
            
        sensitive_cols = json.loads(sensitive_attributes)
        warnings = []
        
        # Validate columns exist
        if target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found.")
        for col in sensitive_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Sensitive column '{col}' not found.")

        # 2. Dataset Summary
        total_rows = len(df)
        missing_values = df.isnull().sum().to_dict()
        
        # Check for Low Data Quality (Warning)
        for col, missing_count in missing_values.items():
            missing_pct = missing_count / total_rows
            if missing_pct > 0.05:
                warnings.append({
                    "type": "Low Data Quality",
                    "severity": "medium",
                    "message": f"Column '{col}' has {missing_pct:.1%} missing values."
                })

        # 3. Distribution Analysis
        target_counts = df[target_column].value_counts()
        target_props = df[target_column].value_counts(normalize=True)
        
        # Class Imbalance Check
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

        # 4. Sensitive Group Analysis
        group_imbalances = {}
        sensitive_groups_data = {}
        
        for col in sensitive_cols:
            counts = df[col].value_counts().to_dict()
            props = df[col].value_counts(normalize=True).to_dict()
            sensitive_groups_data[col] = {
                "counts": counts,
                "proportions": props
            }
            
            # Check Group Imbalance
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

        # 5. Build Response
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)