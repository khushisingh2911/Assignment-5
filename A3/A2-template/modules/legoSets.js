require('dotenv').config();
const Sequelize = require('sequelize');

let sequelize = new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
  host: process.env.PGHOST,
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: { rejectUnauthorized: false },
  },
});

const Theme = sequelize.define('Theme', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: Sequelize.STRING
}, {
  timestamps: false
});

const Set = sequelize.define('Set', {
  set_num: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  name: Sequelize.STRING,
  year: Sequelize.INTEGER,
  num_parts: Sequelize.INTEGER,
  theme_id: Sequelize.INTEGER,
  img_url: Sequelize.STRING
}, {
  timestamps: false
});

Set.belongsTo(Theme, { foreignKey: 'theme_id' });

function initialize() {
  return new Promise((resolve, reject) => {
    sequelize.sync()
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getAllSets() {
  return new Promise((resolve, reject) => {
    Set.findAll({ include: [Theme] })
      .then((sets) => {
        resolve(sets);
      })
      .catch((err) => {
        reject("No sets available.");
      });
  });
}

function getSetByNum(setNum) {
  return new Promise((resolve, reject) => {
    Set.findAll({ include: [Theme], where: { set_num: setNum } })
      .then((sets) => {
        if (sets.length > 0) {
          resolve(sets[0]);
        } else {
          reject("Unable to find requested set");
        }
      })
      .catch((err) => {
        reject("Unable to find requested set");
      });
  });
}

function getSetsByTheme(theme) {
  return new Promise((resolve, reject) => {
    Set.findAll({
      include: [Theme],
      where: {
        '$Theme.name$': {
          [Sequelize.Op.iLike]: `%${theme}%`
        }
      }
    })
    .then((sets) => {
      if (sets.length > 0) {
        resolve(sets);
      } else {
        reject("Unable to find requested sets");
      }
    })
    .catch((err) => {
      reject("Unable to find requested sets");
    });
  });
}

// Add a new set to the database
function addSet(setData) {
  return new Promise((resolve, reject) => {
    Set.create(setData)
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err.errors[0].message);
      });
  });
}

// Get all themes from the database
function getAllThemes() {
  return new Promise((resolve, reject) => {
    Theme.findAll()
      .then((themes) => {
        resolve(themes);
      })
      .catch((err) => {
        reject("Unable to retrieve themes.");
      });
  });
}

// Update an existing set in the database
function editSet(set_num, setData) {
  return new Promise((resolve, reject) => {
    Set.update(setData, { where: { set_num: set_num } })
      .then(([affectedRows]) => {
        if (affectedRows > 0) {
          resolve();
        } else {
          reject("No set found with the specified set_num.");
        }
      })
      .catch((err) => {
        reject(err.errors[0].message);
      });
  });
}

// Delete a set from the database
function deleteSet(set_num) {
  return new Promise((resolve, reject) => {
    Set.destroy({
      where: { set_num: set_num }
    })
    .then(() => {
      resolve();
    })
    .catch((err) => {
      reject(err.errors[0].message);
    });
  });
}

module.exports = { initialize, getAllSets, getSetByNum, getSetsByTheme, addSet, getAllThemes, editSet, deleteSet };
