/********************************************************************************
*  WEB322 – Assignment 04
* 
*  I declare that this assignment is my own work in accordance with Seneca's
*  Academic Integrity Policy:
* 
*  https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
* 
*  Name: Khushi Singh
*  Student ID: 173680216
*  Date: 2024-07-08
*
********************************************************************************/

const legoData = require("./modules/legoSets");
const path = require("path");
const express = require('express');
const fetch = require('node-fetch'); // Using require for CommonJS modules
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));
// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve home.ejs
app.get('/', (req, res) => {
  res.render('home', { page: '/' }); 
});

// Serve about.ejs
app.get('/about', (req, res) => {
  res.render('about', { page: '/about' }); 
});

// Handle requests for Lego sets
app.get("/lego/sets", async (req, res) => {
  try {
    let sets;
    if (req.query.theme) {
      sets = await legoData.getSetsByTheme(req.query.theme);
    } else {
      sets = await legoData.getAllSets();
    }
    res.render('sets', { sets: sets, page: '/lego/sets' }); // Define page for sets route
  } catch (err) {
    res.status(404).render('404', { message: err.message, page: '/lego/sets' }); // Define page for error route
  }
});

// Handle requests for a specific Lego set
app.get("/lego/sets/:num", async (req, res) => {
  console.log(`Fetching details for set number: ${req.params.num}`);
  try {
    let set = await legoData.getSetByNum(req.params.num);
    let response = await fetch('https://api.quotable.io/random'); // Fetch a random quote from Quotable API
    let quote = await response.json();

    res.render('set', { set: set, quote: quote, page: '/lego/sets/:num' }); // Define page for set route
  } catch (err) {
    console.error(`Error fetching set details: ${err}`);
    res.status(404).render('404', { message: err.message, page: '/lego/sets/:num' }); // Define page for error route
  }
});

// Serve the form for adding a new set
app.get('/lego/addSet', async (req, res) => {
  try {
    const themes = await legoData.getAllThemes();
    res.render('addSet', { themes });
  } catch (err) {
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

// Handle form submission for adding a new set
app.post('/lego/addSet', async (req, res) => {
  try {
    const { name, year, num_parts, img_url, theme_id, set_num } = req.body;
    await legoData.addSet({ name, year, num_parts, img_url, theme_id, set_num });
    res.redirect('/lego/sets');
  } catch (err) {
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

// Serve the form for editing an existing set
app.get('/lego/editSet/:num', async (req, res) => {
  console.log(`Attempting to edit set with number: ${req.params.num}`);
  try {
    const setNum = req.params.num;
    const [set, themes] = await Promise.all([
      legoData.getSetByNum(setNum),
      legoData.getAllThemes()
    ]);
    res.render('editSet', { set: set, themes: themes });
  } catch (err) {
    console.error(`Error fetching set or themes: ${err}`);
    res.status(404).render('404', { message: `Unable to retrieve the set or themes: ${err}` });
  }
});

// Handle form submission for editing an existing set
app.post('/lego/editSet', async (req, res) => {
  try {
    const { name, year, num_parts, img_url, theme_id, set_num } = req.body;
    await legoData.editSet(set_num, { name, year, num_parts, img_url, theme_id });
    res.redirect('/lego/sets');
  } catch (err) {
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

// Delete a Lego set
app.post('/lego/deleteSet', async (req, res) => {
  console.log(`Attempting to delete set with number: ${req.params.num}`);
  try {
    await legoData.deleteSet(req.params.num);
    res.redirect('/lego/sets');
  } catch (err) {
    console.error(`Error deleting set: ${err}`);
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});


// Middleware to handle 404 errors
app.use((req, res) => {
  res.status(404).render('404', { message: "Page not found", page: req.url }); // Define page for 404 route
});

// Initialize lego data and start server
legoData.initialize().then(() => {
  app.listen(HTTP_PORT, () => { 
    console.log(`Server listening on: ${HTTP_PORT}`); 
    console.log(`http://localhost:${HTTP_PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize lego data:", err);
});
