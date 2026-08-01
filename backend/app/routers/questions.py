from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from app.config import GEMINI_API_KEY
import json
import re

router = APIRouter(prefix="/api/questions", tags=["questions"])

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-2.5-flash"


class QuestionRequest(BaseModel):
    stage: str
    branch: str
    year: str
    skills: str
    projects: str
    target_company: str
    resume_text: str = ""


class AnswerRequest(BaseModel):
    question: str
    target_company: str
    branch: str = ""
    skills: str = ""


class EvaluateTranscriptItem(BaseModel):
    stage: str
    question: str
    answer: str


class EvaluateRequest(BaseModel):
    target_company: str
    transcript: list[EvaluateTranscriptItem]


STAGE_INSTRUCTIONS = {
    "introduction": "Ask the candidate to introduce themselves in 1 minute. Keep it a simple, open opening question.",
    "educational": "Ask about their branch, college, or favorite subjects — why they chose this field of study.",
    "technical": "Ask a technical question testing their listed skills. Make it specific, not generic.",
    "coding": "Ask a programming/coding question that matches their skill level based on their listed skills.",
    "project": "Ask them to explain one of their listed projects — the tech used, problem solved, their role, or a challenge they faced.",
    "hr": "Ask a classic HR question: strengths, weaknesses, why should we hire you, or their 5-year plan.",
    "company": "Ask why they want to join the target company, or what they know about it.",
    "reverse_qa": "This stage is different — the candidate will ask YOU a question. Simply say: 'Do you have any questions for me?'",
}


def build_prompt(req: QuestionRequest) -> str:
    stage_instruction = STAGE_INSTRUCTIONS.get(req.stage)
    if not stage_instruction:
        raise ValueError(f"Unknown stage: {req.stage}")

    return f"""You are a professional interviewer conducting a job interview for {req.target_company}.

Candidate details:
- Branch: {req.branch}
- Year: {req.year}
- Skills: {req.skills}
- Projects: {req.projects}
- Resume text: {req.resume_text if req.resume_text else "Not provided"}

Current interview stage: {req.stage}
Instruction for this stage: {stage_instruction}

Generate ONE question only. Use the candidate's actual skills/projects where relevant
(not generic questions). Sound like a real human interviewer — natural, professional,
and conversational. Return ONLY the question text, nothing else (no labels, no quotes,
no "Question:" prefix).
"""


def build_answer_prompt(req: AnswerRequest) -> str:
    return f"""You are a professional interviewer at {req.target_company}, wrapping up a job interview.

The candidate just asked you this question: "{req.question}"

Candidate background (for context only): Branch: {req.branch}, Skills: {req.skills}

Answer their question naturally, the way a real interviewer would — helpful, honest,
and professional. Keep it brief (2-4 sentences). Return ONLY the answer text, nothing else
(no labels, no quotes, no "Answer:" prefix).
"""


def build_evaluate_prompt(req: EvaluateRequest) -> str:
    lines = []
    for item in req.transcript:
        lines.append(f"- [{item.stage}] Q: {item.question}\n  A: {item.answer}")
    transcript_text = "\n".join(lines)

    return f"""You are evaluating a completed mock job interview for {req.target_company}.

Full transcript:
{transcript_text}

For EACH item above, score the candidate's answer from 0 to 100 based on clarity, confidence
(how the answer is written/structured), and relevance to the question. If the stage is "coding",
also weigh correctness of the code/logic. Give one short sentence of feedback per answer.

Then, based on the candidate's OVERALL performance across all stages, list:
- 3 to 4 specific strengths
- 3 to 4 specific areas to improve

Return ONLY valid JSON in exactly this format, no markdown fences, no extra text:
{{
  "scores": [{{"stage": "...", "score": <0-100>, "feedback": "..."}}],
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}}
The "scores" array must have exactly one entry per transcript item above, in the same order,
using the same "stage" value shown for each.
"""


def parse_json_response(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return json.loads(cleaned)


@router.post("/generate")
def generate_question(req: QuestionRequest):
    try:
        prompt = build_prompt(req)
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        return {"stage": req.stage, "question": response.text.strip()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")


@router.post("/answer")
def answer_question(req: AnswerRequest):
    try:
        prompt = build_answer_prompt(req)
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        return {"answer": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")


@router.post("/evaluate")
def evaluate_interview(req: EvaluateRequest):
    try:
        prompt = build_evaluate_prompt(req)
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        result = parse_json_response(response.text)
        return {
            "scores": result.get("scores", []),
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")