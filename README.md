# Tamizh Knowledge Hub

Create a new project with Supabase enabled.

You are the lead product architect and senior full-stack engineer for a hackathon project called:



THAMIZHARIVU AI



Project Title:

A Source-Grounded Tamil Knowledge Assistant for Literature, Culture and Digital Heritage



Hackathon:

Aurex'26 – Technical Innovation Hackathon



Selected Track:

Track 05 – Universal Knowledge Assistant / Chatbot



Core Problem:

Build an intelligent, multilingual, source-grounded knowledge assistant that understands natural-language queries, dynamically discovers relevant information from digital sources, retrieves verified content, ranks relevant sources, and generates contextual answers with authentic source/resource links.



IMPORTANT:

The application must not depend on predefined questions, fixed intent mappings, hardcoded keyword rules, or page-specific search rules.



The application must understand:

- Tamil

- English

- Tanglish

- Tamil transliteration

- Mixed Tamil-English queries

- Natural conversational questions

- Vague queries

- Follow-up questions using conversation context



Core architecture:

User Query

→ Query Understanding

→ Query + Conversation Context

→ Dynamic Source Discovery

→ Content Retrieval

→ Hybrid Search

→ Semantic Search using Embeddings

→ Vector Database

→ Source Ranking

→ RAG Context Construction

→ LLM

→ Grounded Answer

→ Authentic Source Links / Citations



The system must use:

1. LLM

2. RAG (Retrieval-Augmented Generation)

3. Embeddings

4. Vector Database

5. Hybrid Search

6. Source Ranking

7. Conversation Memory

8. Tamil NLP

9. Tamil OCR

10. Source verification / grounding



Knowledge sources may include:

- Webpages

- Books

- E-books

- PDFs

- Documents

- Digital archives

- Chapters and sections

- Online reading resources

- Downloads

- Curated Tamil resources



Tamil-focused capabilities:

- Classical Tamil literature discovery

- Tamil cultural knowledge discovery

- Cultural heritage exploration

- Literary context

- Historical and cultural context

- Tamil vocabulary exploration

- Original source viewing

- AI explanation in modern/simple Tamil

- Tamil OCR for scanned documents



Important trust principle:

The AI must not invent factual information.

Answers should be grounded in retrieved source content.

When reliable information cannot be verified, clearly state that the information could not be verified.



The application should provide:

- Answer

- Supporting evidence

- Source title

- Source type

- Source link

- Relevant passage/snippet where possible



OCR pipeline:

Image / scanned PDF / Tamil document

→ Tamil OCR

→ extracted Tamil text

→ correction/editing

→ chunking

→ embeddings

→ vector database

→ searchable knowledge

→ RAG



Cultural Heritage Explorer:

Users should be able to explore:

- Tamil literature

- Classical Tamil

- Festivals

- Traditions

- Arts

- Architecture

- Food traditions

- Historical practices

- Cultural concepts

- Literary works

- Important personalities where supported by sources



Do not make the project a generic chatbot.

The primary identity must be:

A Tamil-first, source-grounded knowledge discovery system.



Design principles:

- Modern

- Professional

- Clean

- Tamil-rooted

- Accessible

- Mobile responsive

- Easy for judges to understand in a live demo

- Strong visual hierarchy

- Clear evidence/source panel



Do not add unnecessary features that reduce reliability or hackathon feasibility.



Build the project in modular phases.

Do not implement everything at once.

Before each phase, explain:

1. What is being built

2. Why it is needed

3. Files/modules affected

4. Dependencies

5. Testing criteria



Never remove an existing working feature while adding a new feature.



The final product should be a working web application suitable for a live hackathon demonstration.

Using the THAMIZHARIVU AI project context already provided, build the complete frontend foundation for the application.



Do NOT implement the real AI/RAG backend yet.



Create a professional, Tamil-rooted responsive web application with these main sections:



1. Landing / Home

2. AI Knowledge Assistant

3. Conversation History

4. Cultural Heritage Explorer

5. Knowledge Sources

6. Document / OCR Upload

7. Search Results

8. Source Evidence Panel

9. About / How It Works



Home page should clearly communicate:



"Ask in Tamil. Discover the Knowledge. Verify the Source."



Show:

- THAMIZHARIVU AI

- Short project description

- Start Exploring button

- Ask AI button

- Cultural Heritage Explorer button

- Upload Document button



AI Assistant UI:

- Chat interface

- Text input

- Language indicator

- Voice input placeholder

- Send button

- Suggested example questions

- Answer area

- Source citation area

- Related questions

- Conversation context indicator



Cultural Explorer:

Create categories for:

- Literature

- Classical Tamil

- Festivals

- Traditions

- Arts

- Architecture

- Food

- History

- Cultural Practices



Source panel:

Show:

- Source title

- Source type

- Source link

- Relevance indicator

- Supporting passage placeholder



OCR page:

- Upload image/PDF

- Processing status

- Extracted Tamil text area

- Edit extracted text

- Send to Knowledge Assistant



Use reusable components.

Keep the architecture ready for later LLM, RAG, vector database, OCR and API integration.



Do not hardcode fake AI answers as the final implementation.

Use clearly marked mock states only for UI development.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://thamizh-arivu-find.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0d0325ce-0a02-4d1c-a568-2d5034979674).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
