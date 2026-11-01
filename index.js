import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import session from "express-session";
import pgSession from "connect-pg-simple";

dotenv.config();


const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});



const app = express();
const port = 3000;

const PgSessionStore = pgSession(session);

const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const sessionStore = new PgSessionStore({
  pool: sessionPool,
  tableName: "user_sessions",
  createTableIfMissing: true,
});

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
app.set("trust proxy", 1);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);


// let currentQuestion = {};
// let totalCorrect = 0;
// let totalWrong = 0;


app.get("/", (req, res) => {
  if (req.session.totalCorrect === undefined) {
    req.session.totalCorrect = 0;
    req.session.totalWrong = 0;
    req.session.previousQuestionId = null;
  }

  req.session.currentQuestion = nextQuestion(req.session);

  res.render("index", {
    question: req.session.currentQuestion,
    totalScore: req.session.totalCorrect,
    totalWrong: req.session.totalWrong
  });
});

app.post("/submit", (req, res) => {
  const answer = (req.body.answer || "").trim();
  let isCorrect = false;

  if (
    req.session.currentQuestion.capital.toLowerCase() ===
    answer.toLowerCase()
  ) {
    isCorrect = true;
    req.session.totalCorrect++;
  } else {
    req.session.totalWrong++;
  }

  if (req.session.totalWrong >= 2) {
    return res.render("index", {
      gameOver: true,
      totalScore: req.session.totalCorrect,
      totalWrong: req.session.totalWrong
    });
  }

  req.session.currentQuestion = nextQuestion(req.session);

  res.render("index", {
    question: req.session.currentQuestion,
    wasCorrect: isCorrect,
    totalScore: req.session.totalCorrect,
    totalWrong: req.session.totalWrong
  });
});

app.get("/restart", (req, res) => {
  req.session.totalCorrect = 0;
  req.session.totalWrong = 0;
  req.session.previousQuestionId = null;

  res.redirect("/");
});

function nextQuestion(sessionData) {
  let availableQuestions = quiz.filter(
    (state) => state.id !== sessionData.previousQuestionId
  );

  if (availableQuestions.length === 0) {
    availableQuestions = quiz;
  }

  const randomState =
    availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

  sessionData.previousQuestionId = randomState.id;

  return randomState;
}


