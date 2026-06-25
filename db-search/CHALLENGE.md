# 📚 meinUnterricht — Technical Challenge

## Problem Statement

**Class is in session!** Create a backend application that helps teachers quickly search and discover relevant teaching materials from our resource catalog.

> The business goal is straightforward: a teacher should be able to type what they are looking for into a search interface and get the most relevant documents back **instantly**.

Currently, we have a **baseline snapshot** of legacy documents that need to be made searchable, but our platform *continuously ingests* new teaching materials. Your solution should handle the initial dataset gracefully while laying the **logical groundwork for ongoing data ingestion**.

How you interpret the dataset and construct your application to deliver an excellent, intuitive search experience for the end user is *entirely up to you*.

## Objective

Deliver a **working MVP prototype**, hosted live on an online server, that solves the problem statement above.

We are assessing your ability to deliver **high-quality functionality quickly**. _Do not over-engineer your code._ A working, clean, and simple implementation that solves the core search problem is **highly preferred** over a hyper-optimized architecture for this prototype. You will have the chance to show off your high-scale systems thinking by providing additional documentation.

### ✅ Must-Haves

- **Backend:** Node.js with TypeScript
- **Database:** PostgreSQL relational database
- **Search Functionality:** an efficient way for users to query the resource catalog and receive relevant results
- **Pragmatism:** build the simplest mechanism that works for the dataset provided

### 🚫 Don'ts

- **Excessive styling / UI effort**: Do not waste hours pixel-pushing. A functional, completely unstyled interface *or* a robust API surface area is what we are looking for.
- **Infrastructure perfectionism**: Do not spend hours provisioning complex production-grade cloud configurations for this stage. Keep the deployment straightforward.

## Deliverables

Your submission must include:

- **The Codebase**: Pushed to this private GitHub repository.
- **The Live Application**: An application accessible online (e.g., [Render](https://render.com), [Fly.io](https://fly.io), [Railway](https://railway.app), or a personal server).
- **User Stories**: Document 2 or 3 brief user stories that outline the specific scope your MVP addresses.
- **Target Production Architecture**: An architectural blueprint section. Use it to outline how you would evolve this system to handle **millions of documents and high concurrent traffic** in a production AWS environment. Please explicitly address:
  - **Scalability**: How would your search logic, data storage, and ingestion pipelines scale? How would you handle *continuous, automated daily additions* of new data without degrading live search performance? What infrastructure patterns, datastores, or queues would you introduce, and **why**?
  - **Zero-Downtime Migration**: Since this data represents a snapshot of a 10-year-old application, how would you safely migrate the live data from the legacy production schema to your proposed target schema with **zero downtime**?
- **AI Tool Usage Documentation**: See the dedicated section below.

## 📬 How to Submit

Once you are done, please submit your challenge via this form: 👉 **[Submission Form](https://docs.google.com/forms/d/e/1FAIpQLSeSVRjCDoazWRE_3vBjqEBKyeQ5uvEBhZiMI8jf9b5zdZq9Pw/viewform)**

Make sure your code is pushed to this repository and your live application is up and running **before** submitting.

## Data

Please seed your application using the provided dataset containing a snapshot of metadata from our legacy resource catalog: 👉 **[`data/teaching-materials.json`](data/teaching-materials.json)** (~10,000 records).

Each record in the dataset follows this structure:

```json
[
  {
    "id": "doc_XXXXXX",
    "title": "Merkblatt – Pritschen und Baggern (Klasse 5)",
    "description": "Merkblatt zum Thema Pritschen und Baggern (Niveau: mittel). Mit Lösungen zur Selbstkontrolle und Aufgaben in mehreren Schwierigkeitsstufen.",
    "tags": ["pritschen-und-baggern", "sport", "spo", "bewegung", "KLASSE 5", "Sekundarstufe", "visualisierung", "zuordnung", "Kreidestaub Verlag"],
    "created_at": "2016-06-19T03:06:30.707Z",
    "preview_image_url": "https://placehold.co/400x300/ea580c/ffffff/png?text=Pritschen%20und%20Baggern"
  }
]
```

Feel free to **transform, post-process, or schema-design** this dataset in whatever way best serves your technical approach.

## 🤖 AI Tool Usage

We **explicitly encourage** you to use modern AI development tools (Cursor, Claude Code, OpenAI Codex, etc.) as a *force multiplier* to accelerate your workflow, generate boilerplate, and deploy quickly.

To maintain transparency and help guide our upcoming technical interview discussion, please document your AI utilization. For each tool used, briefly explain:

- The **main tasks or data manipulation problems** for which you used it
- How you **validated, refactored, and tested** the AI-generated logic
- An **example** of where an AI tool made a suboptimal design choice or introduced a bug, and how your engineering judgment corrected it

## FAQ

<details>
<summary><strong>I'm a pure back-end developer and don't want to build a frontend. What do I do?</strong></summary>

<br>

You have two options here. You can focus **100% on a pure backend API**, provided your application is deployed online and you include a Postman collection or clear `curl` execution examples so we can easily test your endpoints. Alternatively, you can use an AI assistant to quickly *"vibe-code"* a dead-simple, completely unstyled HTML interface to interact with your API. Both approaches are perfectly acceptable. We are evaluating your **systems and application logic, not your CSS skills**.
</details>

<details>
<summary><strong>Do I really have to deploy the application online?</strong></summary>

<br>

**Yes.** Having the application running live ensures a smooth and interactive debrief during our technical interview. Please leverage lightweight deployment platforms like Railway, Render, or Fly.io. If you run into absolute blockers that prevent deployment, you **must** provide a brief video demo of your application running locally, and ensure your local environment is pristine and ready to run live during the interview.
</details>

<details>
<summary><strong>Can I transform the dataset before seeding it in the DB?</strong></summary>

<br>

**Absolutely.** You are entirely free to post-process, normalize, parse, or restructure the dataset as needed to fit your preferred database schema and search strategy.
</details>

<details>
<summary><strong>Should I rather implement technical approach X or technical approach Y?</strong></summary>

<br>

That decision is **entirely up to you** and forms the core evaluation of this challenge. Weigh the product trade-offs regarding *speed of delivery* versus *architectural sustainability*, choose a path, and document your reflection.
</details>

<details>
<summary><strong>Can I use a dedicated search engine (like OpenSearch) or a vector database for the MVP?</strong></summary>

<br>

While you are technically free to use any tools you want, we **highly recommend sticking to PostgreSQL** for the working code to save yourself local configuration and deployment overhead. If you believe a dedicated search tool is the right *ultimate* solution for our platform, detail exactly how you would integrate.
</details>

<details>
<summary><strong>Can I have a time extension for the test?</strong></summary>

<br>

No worries at all. We understand that you have a life, a current job, and professional commitments outside of this hiring process. Simply reach out to us to adjust the timeline.
</details>
