import os
import uuid
import shutil
import subprocess
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pdf2docx import Converter

app = FastAPI(title="PDF a Word API Pro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = os.path.abspath("temp_files")
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_files(file_paths: list[str]):
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"Error limpiando {path}: {e}")

def convert_with_libreoffice(pdf_path: str, output_dir: str) -> str:
    """Convierte PDF a DOCX usando el motor de LibreOffice Writer."""
    cmd = [
        "soffice",
        "--headless",
        "--infilter=writer_pdf_import",
        "--convert-to",
        "docx",
        "--outdir",
        output_dir,
        pdf_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    expected_docx = os.path.splitext(pdf_path)[0] + ".docx"
    if result.returncode == 0 and os.path.exists(expected_docx):
        return expected_docx
    raise RuntimeError(f"LibreOffice falló: {result.stderr}")

@app.get("/")
def health_check():
    return {"status": "ok", "engine": "LibreOffice + pdf2docx"}

@app.post("/api/convert-pdf-to-word")
async def convert_pdf_to_word(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename.lower().endswith(".pdf") or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF válido.")

    unique_id = str(uuid.uuid4())
    pdf_path = os.path.join(TEMP_DIR, f"{unique_id}.pdf")
    docx_path = os.path.join(TEMP_DIR, f"{unique_id}.docx")
    output_filename = f"{os.path.splitext(file.filename)[0]}.docx"

    try:
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Intentar primero con LibreOffice (mayor fidelidad visual y de columnas)
        try:
            convert_with_libreoffice(pdf_path, TEMP_DIR)
        except Exception as lo_error:
            print(f"Usando respaldo pdf2docx por: {lo_error}")
            cv = Converter(pdf_path)
            cv.convert(docx_path, start=0, end=None)
            cv.close()

        background_tasks.add_task(cleanup_files, [pdf_path, docx_path])

        return FileResponse(
            path=docx_path,
            filename=output_filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        cleanup_files([pdf_path, docx_path])
        raise HTTPException(status_code=500, detail=f"Error al procesar el PDF: {str(e)}")