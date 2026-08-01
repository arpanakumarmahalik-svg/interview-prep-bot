from fastapi import APIRouter, UploadFile, File, HTTPException
import pdfplumber
import io
import logging

# Silence pdfplumber's font-parsing warnings — they're harmless (missing font metadata
# in some PDFs), and pdfplumber already falls back gracefully when this happens.
logging.getLogger("pdfminer").setLevel(logging.ERROR)

router = APIRouter(prefix="/api/resume", tags=["resume"])

MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

@router.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    # 1. Check the file is actually a PDF
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # 2. Read the uploaded file into memory
    contents = await file.read()

    # 3. Reject oversized files (never trust frontend checks alone)
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Please upload a PDF under {MAX_FILE_SIZE_MB} MB."
        )

    # 4. Extract text using pdfplumber
    extracted_text = ""
    try:
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read PDF: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No text found in this PDF. It may be a scanned image, not real text."
        )

    return {
        "filename": file.filename,
        "text": extracted_text.strip(),
        "char_count": len(extracted_text)
    }