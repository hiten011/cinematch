var express = require('express');
const path = require('path');
var router = express.Router();

// Track that the user visited the site (session analytics)
router.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|map)$/i)) {
        req.session.visited = true;
    }
    next();
});

module.exports = router;
