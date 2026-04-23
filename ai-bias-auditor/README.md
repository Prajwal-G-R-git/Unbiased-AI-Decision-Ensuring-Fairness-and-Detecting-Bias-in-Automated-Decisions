# Unbiased AI Decision Auditor

A full-stack application to detect, measure, explain, and mitigate bias in datasets and machine learning models.

## Architecture

- **Backend**: FastAPI, Pandas, Scikit-learn, Fairlearn, SHAP
- **Frontend**: React (Vite), Tailwind CSS, Recharts, Axios

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Running Locally

1. Start the backend server:
```bash
cd backend
# Make sure your virtual environment is active
uvicorn main:app --reload --port 8000
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

## How to Test

1. Navigate to `http://localhost:5173` in your browser.
2. Click **Upload Dataset** and select `backend/data/sample_dataset.csv`.
3. The system will automatically detect the `gender` column as sensitive and `loan_approved` as the target.
4. Set the **Favorable Class Value** to `1`.
5. Click **Run Bias Analysis**.
6. View the Dashboard:
   - **Metrics Tab**: See Disparate Impact Ratio and Demographic Parity Difference.
   - **Eval Tab**: See model performance metrics (Accuracy, F1) across groups.
   - **Mitigate Tab**: Apply `CorrelationRemover` to mitigate bias and view SHAP feature importance.
# new-UAI
