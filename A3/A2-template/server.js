require('dotenv').config();

const express = require('express'); 
const path = require('path'); 
const fetch = require('node-fetch'); 
const bcrypt = require('bcryptjs');
const clientSessions = require('client-sessions'); 
const legoData = require("./modules/legoSets"); 
const authData = require('./modules/auth-service'); 

const app = express();
const HTTP_PORT = process.env.PORT || 8080; 

app.use(clientSessions({
  cookieName: 'session', 
  secret: '1569664286167cb785084306d', 
  duration: 24 * 60 * 60 * 1000, 
  activeDuration: 30 * 60 * 1000
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next(); 
});

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

Promise.all([
  legoData.initialize(),
  authData.initialize() 
]).then(() => {
  // Routes
  app.get('/', (req, res) => {
    res.render('home', { page: '/' });
  });

  app.get('/about', (req, res) => {
    res.render('about', { page: '/about' }); 
  });

  app.get("/lego/sets", async (req, res) => {
    try {
      let sets;
      if (req.query.theme) {
        sets = await legoData.getSetsByTheme(req.query.theme);
      } else {
        sets = await legoData.getAllSets();
      }
      res.render('sets', { sets: sets, page: '/lego/sets' }); 
    } catch (err) {
      res.status(404).render('404', { message: err.message, page: '/lego/sets' });
    }
  });

  app.get("/lego/sets/:num", async (req, res) => {
    console.log(`Fetching details for set number: ${req.params.num}`); 
    try {
      let set = await legoData.getSetByNum(req.params.num); 
      let response = await fetch('https://api.quotable.io/random'); 
      let quote = await response.json();
      res.render('set', { set: set, quote: quote, page: `/lego/sets/${req.params.num}` }); 
    } catch (err) {
      console.error(`Error fetching set details: ${err}`); 
      res.status(404).render('404', { message: err.message, page: `/lego/sets/${req.params.num}` }); 
    }
  });

  app.get('/lego/addSet', async (req, res) => {
    try {
      const themes = await legoData.getAllThemes(); 
      res.render('addSet', { themes, page: '/lego/addSet' }); 
    } catch (err) {
      res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` }); 
    }
  });

  app.post('/lego/addSet', ensureLogin, async (req, res) => {
    try {
      const { name, year, num_parts, img_url, theme_id, set_num } = req.body; 
      await legoData.addSet({ name, year, num_parts, img_url, theme_id, set_num }); 
      res.redirect('/lego/sets'); 
    } catch (err) {
      res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` }); 
    }
  });

  app.get('/lego/editSet/:num', ensureLogin, async (req, res) => {
    console.log(`Attempting to edit set with number: ${req.params.num}`); 
    try {
      const setNum = req.params.num; 
      const [set, themes] = await Promise.all([
        legoData.getSetByNum(setNum), 
        legoData.getAllThemes() 
      ]);
      res.render('editSet', { set: set, themes: themes, page: `/lego/editSet/${setNum}` }); 
    } catch (err) {
      console.error(`Error fetching set or themes: ${err}`); 
      res.status(404).render('404', { message: `Unable to retrieve the set or themes: ${err}`, page: `/lego/editSet/${req.params.num}` }); 
    }
  });

  app.post('/lego/editSet', ensureLogin, async (req, res) => {
    try {
      const { name, year, num_parts, img_url, theme_id, set_num } = req.body; 
      await legoData.editSet(set_num, { name, year, num_parts, img_url, theme_id }); 
      res.redirect('/lego/sets'); 
    } catch (err) {
      res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` }); 
    }
  });

  app.post('/lego/deleteSet', ensureLogin, async (req, res) => {
    const setNum = req.body.set_num; 
    console.log(`Attempting to delete set with number: ${setNum}`); 
    try {
      await legoData.deleteSet(setNum); 
      res.redirect('/lego/sets'); 
    } catch (err) {
      console.error(`Error deleting set: ${err}`); 
      res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` }); 
    }
  });
  
  app.get('/login', (req, res) => {
    res.render('login', { errorMessage: req.session.errorMessage || null, userName: req.session.userName || '' }); 
    req.session.errorMessage = null; 
  });

  app.post('/login', async (req, res) => {
    try {
      const { userName, password } = req.body; 
      const user = await authData.checkUser(userName, password, req.session.userAgent || ''); 
      req.session.userName = userName; 
      req.session.user = user; 
      res.redirect('/'); 
    } catch (err) {
      req.session.errorMessage = err.message; 
      res.redirect('/login'); 
    }
  });

  app.get('/register', (req, res) => {
    res.render('register', {
      successMessage: req.session.successMessage || null,
      errorMessage: req.session.errorMessage || null,
      userName: req.session.userName || ''
    });
    req.session.successMessage = null;
    req.session.errorMessage = null;
  });

  app.post('/register', async (req, res) => {
    try {
      const userData = req.body;
      await authData.registerUser(userData);
      req.session.successMessage = "User created";
      res.redirect('/register');
    } catch (err) {
      console.error(`Error registering user: ${err}`);
      req.session.errorMessage = err.message;
      res.redirect('/register');
    }
  });

  app.get('/logout', (req, res) => {
    req.session.reset(); 
    res.redirect('/'); 
  });

  app.get('/userHistory', ensureLogin, async (req, res) => {
    res.render('userHistory', { page: '/userHistory' }); 
  });

  function ensureLogin(req, res, next) {
    if (!req.session.user) {
      res.redirect('/login'); 
    } else {
      next();
    }
  }

  app.listen(HTTP_PORT, () => { 
    console.log(`Server listening on: ${HTTP_PORT}`); 
    console.log(`http://localhost:${HTTP_PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize services:", err);
});
