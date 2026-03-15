from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv


load_dotenv()


llm = ChatOpenAI(model=os.getenv("DEEPSEEK_MODEL"),
                temperature=0, 
                api_key=os.getenv("DEEPSEEK_API_KEY"),
                base_url=os.getenv("DEEPSEEK_BASE_URL"))

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that can answer questions and help with tasks."),
    ("user", "{messages}"),
])

agent = prompt | llm

if __name__ == "__main__":
    result = agent.invoke({"messages": [{"role": "user", "content": "What is the capital of France?"}]})
    print(result.content)