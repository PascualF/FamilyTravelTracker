import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "PortoBenfica42",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;


// This fonction updates the map
async function checkVisisted(userChosen) {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [userChosen]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

// Update the users
async function usersUpdate(){
  const result = await db.query("SELECT * FROM users");
  let users = [];
  result.rows.forEach((user) => {
    users.push(user)
  });
  return users
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted(currentUserId);
  const users = await usersUpdate();
  const color = await db.query("SELECT color FROM users WHERE id=$1", [currentUserId])

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color.rows[0].color,
  });
});

app.post("/add", async (req, res) => {
  
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    console.log(result.rows.length === 0)
    if (result.rows.length === 0) {
      res.redirect("/")
    }

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      

      const countries = await checkVisisted(currentUserId);
      const users = await usersUpdate();
      const color = await db.query("SELECT color FROM users WHERE id=$1", [currentUserId])
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

// when a user is clicked, the DATABASE changes for that particular chosen user.
app.post("/user", async (req, res) => {
  
  
  if (req.body.add === 'new') {
    res.render("new.ejs")
  } else {
      const userChosen = req.body.user
      currentUserId = userChosen
      const countries = await checkVisisted(userChosen)
      const color = await db.query("SELECT color FROM users WHERE id=$1", [userChosen])
      const users = await usersUpdate();

      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: color.rows[0].color,
       });
  }



});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  try {
    const name = req.body.name;
    const color= req.body.color;

    const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id", [name, color]);

    currentUserId = result.rows[0].id

    res.redirect("/")
  } catch (err) {
    console.log("Error executing query: " + err.stack)
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
