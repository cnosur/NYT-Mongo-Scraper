const express = require("express");
const router = express.Router();
const db = require("../models");
const request = require("request"); //Makes http calls
const cheerio = require("cheerio");
 
// A GET route for scraping the NYT website
router.get("/scrape", function (req, res) {
    // First, we grab the body of the html with request
    request("https://www.nytimes.com/", function (error, response, body) {
        if (!error && response.statusCode === 200) {
            // Then, we load that into cheerio and save it to $ for a shorthand selector
            var $ = cheerio.load(body);
            // Now, we grab every article:
            $('article').each(function (i, element) {
                // Save an empty result object
                let count = i;
                let result = {};
                // Add the text and href of every link, and summary and byline, saving them to object
                result.title = $(element)
                    .children('.story-heading')
                    .children('a')
                    .text().trim();
                result.link = $(element)
                    .children('.story-heading')
                    .children('a')
                    .attr("href");
                result.summary = $(element)
                    .children('.summary')
                    .text().trim()
                    || $(element)
                        .children('ul')
                        .text().trim();
                result.byline = $(element)
                    .children('.byline')
                    .text().trim()
                    || 'No byline available'
                
                if (result.title && result.link && result.summary){
                    // Create a new Article using the `result` object built from scraping, but only if both values are present
                    db.Article.create(result)
                        .then(function (dbArticle) {
                            // View the added result in the console
                            console.log(dbArticle);
                        })
                        .catch(function (err) {
                            // If an error occurred, send it to the client
                            return res.json(err);
                        });
                };
            });
            // If we were able to successfully scrape and save an Article, send a message to the client
            res.send(`Scrape complete: Added 20 new articles`);
        }
        else if (error || response.statusCode != 200){
            res.send("Error: Unable to obtain new articles")
        }
    });
}),

router.get("/", (req, res) => {
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            const retrievedArticles = dbArticle;
            if (retrievedArticles !== [] ){
                let hbsObject;
                hbsObject = {
                    articles: dbArticle
                };
                res.render("index", hbsObject);
                console.log("The first thing ran!!")
            }
            else {
                res.render("noarticles");
                console.log("This thing ran!!")
            }
            
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

router.get("/saved", (req, res) => {
    db.Article.find({isSaved: true})
        .then(function (retrievedArticles) {
            // If we were able to successfully find Articles, send them back to the client
            let hbsObject;
            hbsObject = {
                articles: retrievedArticles
            };
            res.render("saved", hbsObject);
            console.log("The first thing ran!!")
            
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for getting all Articles from the db
router.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

router.put("/save/:id", function (req, res) {
    db.Article.findOneAndUpdate({ _id: req.params.id }, { isSaved: true }, { new: false });
});

// Route for grabbing a specific Article by id, populate it with it's note
router.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
}),

// Route for saving/updating an Article's associated Note
router.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
})

module.exports = router;