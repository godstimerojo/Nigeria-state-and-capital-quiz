import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();


const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});



const app = express();
const port = 3000;

let quiz = [];

async function connectDatabase() {
  try {
    await db.connect();

    console.log("Connected to Supabase PostgreSQL!");

    const result = await db.query(
      "SELECT * FROM public.nigeria_state"
    );

    quiz = result.rows;

    console.log(`Loaded ${quiz.length} states`);

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

  } catch (err) {
    console.error("Database error:", err.message);
    process.exit(1);
  }
}

connectDatabase();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentQuestion = {};
let totalCorrect = 0;
let totalWrong = 0;

app.get("/", (req, res) => {
  currentQuestion = nextQuestion();

  res.render("index", { 
    question: currentQuestion,
    totalScore: totalCorrect,
    totalWrong: totalWrong 
  });
});

app.post("/submit", (req, res) => {
  let answer = req.body.answer.trim();
  let isCorrect = false;

  if (currentQuestion.capital.toLowerCase() === answer.toLowerCase()) {
    isCorrect = true;
    totalCorrect++;
  } else {
    totalWrong++;
  }

  if (totalWrong >= 2) {
    return res.render("index", {
      gameOver: true,
      totalScore: totalCorrect,
      totalWrong: totalWrong
    });
  }

  currentQuestion = nextQuestion();
  res.render("index", { 
    question: currentQuestion, 
    wasCorrect: isCorrect, 
    totalScore: totalCorrect,
    totalWrong: totalWrong 
  });
  
});

app.get("/restart", (req, res) => {
    totalCorrect = 0;
    totalWrong = 0;
    previousQuestion = null;

    res.redirect("/");
});

let previousQuestion = null;
function nextQuestion() {
    let randomState;

    do {
        randomState = quiz[Math.floor(Math.random() * quiz.length)];
    } while (quiz.length > 1 && randomState === previousQuestion);

    previousQuestion = randomState;

    return randomState;
}


