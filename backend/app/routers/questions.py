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


class ScoreRequest(BaseModel):
    stage: str
    question: str
    answer: str
    target_company: str = ""


class TranscriptItem(BaseModel):
    stage: str
    question: str
    answer: str
    score: int | None = None


class SummaryRequest(BaseModel):
    target_company: str
    transcript: list[TranscriptItem]


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


def build_score_prompt(req: ScoreRequest) -> str:
    return f"""You are grading a candidate's answer in a job interview for {req.target_company}.

Interview stage: {req.stage}
Question: {req.question}
Candidate's answer: {req.answer}

Score this answer from 0 to 100 based on clarity, confidence (how the answer is written/structured),
and relevance to the question. If the stage is "coding", also weigh correctness of the code/logic.

Return ONLY valid JSON in exactly this format, with no markdown code fences and no extra text:
{{"score": <number 0-100>, "feedback": "<one short sentence of feedback>"}}
"""


def build_summary_prompt(req: SummaryRequest) -> str:
    lines = []
    for item in req.transcript:
        score_text = item.score if item.score is not None else "N/A"
        lines.append(f"- [{item.stage}] Q: {item.question}\n  A: {item.answer}\n  Score: {score_text}")
    transcript_text = "\n".join(lines)

    return f"""You are reviewing a completed mock job interview for {req.target_company}.

Full transcript:
{transcript_text}

Based on the candidate's overall performance across all stages, list:
- 3 to 4 specific strengths
- 3 to 4 specific areas to improve

Return ONLY valid JSON in exactly this format, no markdown fences, no extra text:
{{"strengths": ["...", "..."], "improvements": ["...", "..."]}}
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


@router.post("/score")
def score_answer(req: ScoreRequest):
    try:
        prompt = build_score_prompt(req)
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        result = parse_json_response(response.text)
        return {"score": result.get("score", 0), "feedback": result.get("feedback", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")


@router.post("/summarize")
def summarize_interview(req: SummaryRequest):
    try:
        prompt = build_summary_prompt(req)
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        result = parse_json_response(response.text)
        return {
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")