// Patch http.createServer to prevent binding to port 80
const http = require('http');
http.createServer = function () {
    console.log('⚠️ HTTP server on port 80 disabled (handled by Nginx)');
    return {
        listen: () => console.log('HTTP.listen() ignored'),
        once: () => {},
        on: () => {},
        emit: () => {}
    };
};
