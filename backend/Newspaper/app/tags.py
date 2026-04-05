# def generate_tags(text):
#     tags = []

#     if "constitution" in text.lower():
#         tags.append("Polity")
#     if "economy" in text.lower():
#         tags.append("Economy")
#     if "china" in text.lower():
#         tags.append("IR")
#     if "technology" in text.lower():
#         tags.append("Science")

#     return tags
import ast
from app.summarizer import call_llm

def generate_tags(text):
    prompt = f"""
Classify this news into UPSC GS categories:

Options:
- Polity
- Economy
- International Relations
- Science & Tech
- Environment

Return ONLY a Python list.

Text:
{text[:3000]}
"""
    response = call_llm(prompt)

    try:
        return ast.literal_eval(response)
    except:
        return [response]
    
def generate_importance(text):
    #from app.summarizer import call_llm

    prompt = f"""
Explain in 3-4 lines why this news is important for UPSC preparation.

Focus on:
- GS paper relevance
- Conceptual importance

Text:
{text[:3000]}
"""
    return call_llm(prompt)