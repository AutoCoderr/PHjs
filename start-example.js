const PHjs = require("./PHjs");

const options = {};

const libs = {};

PHjs("/projects/PHjs/website/","http",8000,options,libs,"/projects/PHjs/access.log","/projects/PHjs/error.log","/projects/PHjs/config.txt");
