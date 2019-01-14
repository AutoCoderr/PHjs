const rfs = require('require-from-string'),

      http = require("http"),

      https = require("https"),

	  sessions = require("client-sessions"),

      fs = require("fs-extra"),

      url = require('url'),

      formidable = require('formidable'),

	  rc = require("read-chunk"),

	  ft = require("file-type"),

	  util = require("util"),

	  functionsl = require(__dirname + "/functions.js");



const remplace = functionsl.remplace,

	  genconf = functionsl.genconf,

	  getargs = functionsl.getargs,

	  isAuthorized = functionsl.isAuthorized,

	  RedirectedTo = functionsl.RedirectedTo,

	  asMIME = functionsl.asMIME,

	  getPath = functionsl.getPath,

	  getFileName = functionsl.getFileName,

	  ProcessPageInclude = functionsl.ProcessPageInclude,

	  copyDict = functionsl.copyDict,

	  logupload = functionsl.logupload,

	  equal = functionsl.equal,

	  toMin = functionsl.toMin;

	

var StartServer = function (path,proto,port,options,libs,logaccess,logerror,conffile) {

	// verifie if variables are corrects

	if (typeof(path) != "string") {

		throw new Error("Variable 'path' incorrecte");

	}

	

	if (typeof(proto) != "string") {

		throw new Error("Variable 'proto' incorrecte");

	} else if (proto != 'http' & proto != 'https') {

		throw new Error("Variable 'proto' ni http ni https");

	}

	

	if (typeof(port) != "string" & typeof(port) != "number") {

		if (proto == 'http') {

			port = 80;

		} else if (proto == 'https') {

			port = 443;

		}

	}

	

	if (typeof(options) != "object" | Array.isArray(options)) {

		if (proto == 'http') {

			options = {};	

		} else {

			throw new Error("Variable 'options' incorrecte");

		}

	}

	

	if (typeof(libs) != "object" | Array.isArray(libs)) {

		libs = {};

	}

	

	if (typeof(path) != 'string') {

		throw new Error("Variable path incorrecte");

	} else if (!fs.existsSync(path)) {

		throw new Error("Le chemin '" + path + "' n'existe pas");

	}

	

	if (typeof(port) == 'string') {

		port = parseInt(port);

		if (isNaN(port)) {

			throw new Error("Variable 'port' incorrecte");

		}

	} else if (typeof(port) == "number" & isNaN(port)) {

		throw new Error("Variable 'port' incorrecte");

	}

	

	if (typeof(logaccess) != "string") {

		throw new Error("'logaccess' variable incorrect");

	} else if (!fs.existsSync(logaccess)) {

		fs.writeFile(logaccess, "There is the log file : \n", function(err) {

			if(err) {

				throw err;

			}

		}); 

	} else if(fs.statSync(logaccess).isDirectory()) {

		throw new Error("'logaccess' : '" + logaccess + "' is a directory");

	}

	

	if (typeof(logerror) != "string") {

		throw new Error("'logerror' variable incorrect");

	} else if (!fs.existsSync(logerror)) {

		fs.writeFile(logerror, "There is the error log file : \n", function(err) {

			if(err) {

				throw err;

			}

		}); 

	} else if(fs.statSync(logerror).isDirectory()) {

		throw new Error("'logerror' : '" + logerror + "' is a directory");

	}

	

	if (typeof(conffile) != "string") {

		throw new Error("'conffile' variable incorrect");

	} else if (conffile == "nothing"){

		var conf = {allow: [], forbidden: [], redirect: [], options: []};

	} else if (!fs.existsSync(conffile)) {

		throw new Error("'" + conffile + "' not exist"); 

	} else if(fs.statSync(conffile).isDirectory()) {

		throw new Error("'" + conffile + "' is a directory");

	}

	

	if (conffile != "nothing") {

		var conf = genconf(conffile);

	} else {

		var conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {active: "NO"}};

	}

	

	/*console.log(conf);

	console.log("")

	

	for (var i=0;i<conf.options.length;i++){

		console.log(conf.options[i].options);

	}*/

	

	console.log("log files : \naccess: " + logaccess + "\nerrors: " + logerror + "\n\nconffile:\n  " + conffile);

	

	if (path[path.length-1] == "/") {

			path = path.substring(0,path.length-1);

	}

	const laSession = sessions({

		cookieName: 'session',

		secret: 'blargadeeblargblarg', 

		duration: 60 * 60 * 1000, 

		activeDuration: 1000 * 60 * 5

	});

	

	var GlobalVars = {};

	

	var serverScript = function(req, res) { // --------------------------> LE SERVEUR WEB <------------------------------------------------------

	    var redirected;

		res.setHeader('Access-Control-Allow-Origin', '*');

		res.setHeader('Access-Control-Request-Method', '*');

		res.setHeader('Access-Control-Allow-Headers', '*');

		var page = url.parse(req.url).pathname;

		var ipsrc = remplace(req.connection.remoteAddress,"::ffff:","");

        var args = {GET: {}, POST: {}};

        if (req.method == "POST") { // IF POST METHOD, DOWNLOADS FILES AND ARGURMENTS AND PUT IT IN THE 'ARGS' VARIABLE IN ASYNCHRONOUS FUNCTION

            var form = new formidable.IncomingForm();

			form.parse(req, function(err, fields, files) {

			  if (err) {

			    throw err;

			  } else {

				for (var key in fields) {

					args.POST[key] = {content: fields[key], type: "text" };

				}

				for(var key in files) {

					args.POST[key] = {content: files[key], type: "file" };

				}

				if (typeof(ext) != "undefined" & ext == "phjs") { // IF FILE IS PHJS, START LAUCHEPHJS()

					lauchphjs();

				} else { // ELSE IF IS NOT PHJS, DELETE DOWNLOADEDS FILES

					for (var key in files) {

					  fs.remove(files[key].path, function(err) {

						if (err) {

							console.log("Error when delete '" + files[key].path + "' : ");

							console.log(err);

						}

					  });

					}

				}

			  }

			});

        } else if(req.method == "GET") { // IF GET METHOD, PUT ARGUMENTS IN THE 'ARGS' VARIABLE

			args.GET = getargs(url.parse(req.url).query);

        }

		if (page[page.length-1] == "/") {

			page = page.substring(0,page.length-1);

		}

		page = remplace(page,"%20"," ");
		page = remplace(page,"%C3%A9","é");
		page = remplace(page,"%C3%A8","è");
		page = remplace(page,"%C3%A0","à");
		page = remplace(page,"%C3%B9","ù");
		page = remplace(page,"%25","%");

		if (fs.existsSync(path + page)) { // IF PATH EXISTS, SET THE TYPE ('FOLDER' OR 'FILE')

				if(fs.statSync(path + page).isDirectory()) {

				  var type = "folder";

				  page = page + "/";

				} else {

				  var type = "file";

				  //console.log(page);

				  if (!isAuthorized(page,conf,type)) {

					  res.writeHead(403, {"Content-Type": "text/plain"});

					  res.end("ERROR 403 : ACCESS FORBIDDEN");

					  log(403,'INFO',"ACCESS FORBIDDEN");

					  return;

				  }

				  redirected = RedirectedTo(page,conf,type);

				  if (redirected != false & redirected != "undefined") {

					  res.writeHead(301, {"Location": redirected});

					  res.end();

					  log(301,'INFO',"REDIRECTED TO " + redirected);

					  return;

				  }

				}

		} else {

			if (page == "/icons/folder.gif" //IF PATH DOES NOT EXIST BUT IT IS AN ICON GIF IN THIS LIST, SEND IT

  			  | page == "/icons/unknown.gif" 

			  | page == "/icons/image.gif" 

			  | page == "/icons/text.gif"

			  | page == "/icons/binary.gif"

			  | page == "/icons/compressed.gif") {

				fs.readFile(__dirname + "/.." + page, function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "image/gif"});

						res.end(content);

					}

				});

				return;

			} else if (page == "/socket.io.js"

			         | page == "/fastupload.js"

					 | page == "/jquery.js") {

				fs.readFile(__dirname + "/../libclient" + page, function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "application/javascript"});

						res.end(content);

						log(200,'INFO',"");

					}	

				});

				return;

				

			} else { // ELSE IF NOT EXISTS, SEND 404 ERROR

				res.writeHead(404, {"Content-Type": "text/plain"});

				res.end("ERROR 404 : Page not found");

				log(404,'INFO',"PAGE NOT FOUND");

				return;

			}

		}

		

		

		if (type == "folder"){ // IF TYPE IS 'FOLDER', SEARCH AN INDEX OR AN FILE WITH THE NAME OF FOLDER

			if (page != "/") {

				if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".html") & (page.split("/")[page.split("/").length-2]) != "index") {

					page = page + (page.split("/")[page.split("/").length-2]) + ".html";

					type = "file";

				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".js") & (page.split("/")[page.split("/").length-2]) != "index") {

					page = page + (page.split("/")[page.split("/").length-2]) + ".js";

					type = "file";

				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".phjs") & (page.split("/")[page.split("/").length-2]) != "index") {

					page = page + (page.split("/")[page.split("/").length-2]) + ".phjs";

					type = "file";

				}

            }			

			if (fs.existsSync(path + page + "index.phjs")) {

				page = page + "index.phjs";

				type = "file";

			} else if (fs.existsSync(path + page + "index.html")) {

				page = page + "index.html";

				type = "file";

			} else if (fs.existsSync(path + page + "index.js")) {

				page = page + "index.js";

				type = "file";

			}

		}

		if (type == "folder"){ // IF WE DO NOT FOUND AN INDEX OR OTHER FILES IN FOLDER, LISTING ALL FILES AND FOLDERS IN IT AND RETURN

		    if (!isAuthorized(page,conf,type)) {

				res.writeHead(403, {"Content-Type": "text/plain"});

				res.end("ERROR 403 : ACCESS FORBIDDEN");

				log(403,'INFO',"ACCESS FORBIDDEN");

				return;

			}

			redirected = RedirectedTo(page,conf,type);

			if (redirected != false & redirected != "undefined") {

				res.writeHead(301, {"Location": redirected});

				res.end();

				log(301,'INFO',"REDIRECTED TO " + redirected);

				return;

			}

			fs.readdir(path + page, function(err, items) {

				if (err) {

					log(500,'ERROR',"\nError when listing '" + path.page + "'\n" + util.format(err));

					return;

				}

				res.writeHead(200, {"Content-Type": "text/html"});

                res.write("<meta charset='UTF-8'>");

				if (page != "/") {

					res.write("<a href='..'><font color='grey' size='4'>dossier parent</font></a>");

				}

				res.write("<table>");

				var ext;

				for (var i=0; i<items.length; i++) {

					if (fs.statSync(path + page + items[i]).isDirectory()) {

						res.write("<tr><td><img src='/icons/folder.gif'></td><td><a href='" + page + items[i] + "/'>" + items[i] + "</a></td></tr>");

					} else {

						ext = items[i].split(".")[items[i].split(".").length-1];

						if (ext == "png" | ext == "jpg" | ext == "gif" | ext == "jpeg" | ext == "bmp" | ext == "tif" | ext == "tiff") {

							res.write("<tr><td><img src='/icons/image.gif'></td>");

						} else if (ext == "gz" | ext == "tar" | ext == "zip" | ext == "rar" | ext == "7z") {

							res.write("<tr><td><img src='/icons/compressed.gif'></td>");

						} else if (ext == "txt" | ext == "log") {

							res.write("<tr><td><img src='/icons/text.gif'></td>");

						} else if (ext == "exe" | ext == "dll" | ext == "so") {

							res.write("<tr><td><img src='/icons/binary.gif'></td>");

						} else {

							res.write("<tr><td><img src='/icons/unknown.gif'></td>");

						}					

						res.write("<td><a href='" + page + items[i] + "'>" + items[i] + "</a></td></tr>");

					}

				}			

				res.end("</table>");

				log(200,'INFO',"");

			});

			return;

		}

		if (!isAuthorized(page,conf,type)) {

			res.writeHead(403, {"Content-Type": "text/plain"});

			res.end("ERROR 403 : ACCESS FORBIDDEN");

			log(403,'INFO',"ACCESS FORBIDDEN");

			return;

		}

		redirected = RedirectedTo(page,conf,type);

		if (redirected != false & redirected != "undefined") {

			res.writeHead(301, {"Location": redirected});

			res.end();

			log(301,'INFO',"REDIRECTED TO " + redirected);

			return;

		}

		var mime = {mime: asMIME(page,conf)} // GET MIME DECIDED FOR THIS FILE IN CONFIG

		//console.log(mime);

		page = path + page;

		if (mime.mime == false) { // IF NO MIME DECIDED

			var mime = ft(rc.sync(page,0,100)); // GET MIME TYPE OF THE FILE

			//console.log(mime);

		}

		if (mime == null) { // IF NO MIME FOUND

			var ext = page.split(".")[page.split(".").length-1];

			if (ext == "phjs") { // IF FILE IS PHJS, START EXECUTING IT WITH LAUNCHPHJS()

				if (req.method == "GET") {

					lauchphjs();

				} else if (req.method == "POST") { // IF METHOD IS POST, RETURN AND WAIT FOR THE ASYNCHRONOUS FUNCTION TO START LAUCHPHJS()

					return;

				}

			} else { // ELSE IF IS NOT PHJS, SEND FILE HAS HTML

				fs.readFile(page, 'utf-8', function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "text/html"});

						res.end(content);

						log(200,'INFO',"");

					}

				});

			}

		} else { // IF MIME FOUND

			mime = mime.mime;

			//console.log(mime);

			if (mime.replace("/","") != mime & mime.split("/")[0] == "audio") { // IF FILE IS AUDIO

				fs.stat(page, function(error,stats) {

					if (error) {

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {

						'Content-Type': 'audio/' + mime.split("/")[mime.split("/").length-1],

						'Content-Length': stats.size

						});

						log(200,'INFO',"");

						fs.createReadStream(page).pipe(res);

					}	

				});

			} else if (mime.replace("/","") != mime & mime.split("/")[0] == "video") { //IF FILE IS VIDEO

				fs.stat(page, function(error, stats) {

					if (error) {

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

						return;

					}

					log(200,'INFO',"");

					var range = req.headers.range;

					var total = stats.size;

					if (!range | typeof(range) == "undefined") {

						res.writeHead(200, {

							"Content-Length": total,

							"Content-Type": "video/" + mime.split("/")[mime.split("/").length-1]

						});

						fs.createReadStream(page).pipe(res);

						return;

					}

					var positions = remplace(range,"bytes=", "").split("-");

					var start = parseInt(positions[0], 10);

					var end = positions[1] ? parseInt(positions[1], 10) : total - 1;

					var chunksize = (end - start) + 1;

	

					res.writeHead(206, {

						"Content-Range": "bytes " + start + "-" + end + "/" + total,

						"Accept-Ranges": "bytes",

						"Content-Length": chunksize,

						"Content-Type": "video/" + mime.split("/")[mime.split("/").length-1]

					});

	

					var stream = fs.createReadStream(page, { start: start, end: end })

					.on("open", function() {

						stream.pipe(res);

					})

					.on("error", function(err) {

						res.end(err);

					});

				});

			} else if (mime == "phjs" | mime == "PHJS") { //IF MIME DECIDED IS PHJS, START AS PHJS

				if (req.method == "GET") {

					lauchphjs();

				} else if (req.method == "POST") { // IF METHOD IS POST, RETURN AND WAIT FOR THE ASYNCHRONOUS FUNCTION TO START LAUCHPHJS()

					return;

				}

			} else { // IF FILE IS IMAGE OR OTHER

				fs.readFile(page, function(error, content) {

					if(error != null | mime.replace("/","") == mime){

						//console.log("image or other --> error \nerror : " + util.format(error));

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						//console.log("image or other --> success");

						res.writeHead(200, {"Content-Type": mime.split("/")[0] + "/" + mime.split("/")[mime.split("/").length-1]});

						res.end(content);

						log(200,'INFO',"");

					}	

				});	

			}

		}

		function lauchphjs() { // START PHJS

			ProcessPage(page,args,libs, function (content,session,code) { // START FUNCTION TO PROCESS HTML PAGE FROM PHJS, AND PUT THE RESULT IN 'CONTENT' VARIABLE


				for (var key in session) {
					req.session[key] = session[key];
				}

				if (typeof(code) != 'number') {
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end("500 : INTERNAL ERROR");
					log(500,'ERROR',"NO VARIABLE TYPE FOR HTTP CODE\n");
					return;
				} else if (code >= 400 & code < 600) {
					res.writeHead(code, {"Content-Type": "text/plain"});
					if (code < 500) {
						res.end("ERROR "+code);	
					} else {
						res.end(code+" : INTERNAL ERROR");
					}
					return;
				} else if (code >= 600) {
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end("500 : INTERNAL ERROR");
					log(500,'ERROR',"HTTP CODE INVALID\n");
					return;
				}

				if (content != "ERROR") { // IF THERE ARE NOT ERROR

					for (var i=0;i<content.length;i++) {

						if (i == 0 & content[i].type == "html") {

							res.writeHead(code, {"Content-Type": "text/html"});

						} else if (i == 0 & content[i].type == "json") {

							res.writeHead(code, {"Content-Type": "application/json"});

						}

						if (content[i].type == "json") {

							res.end(JSON.stringify(content[i].chaine));
							break;

						} else if (content[i].type == "html") {

							res.write(content[i].chaine);

						}

						//res.write({'wesh': "wesh"});

					}

					res.end("");

					log(200,'INFO',"");

				} else { // IF THERE IS ERROR

					res.writeHead(500, {"Content-Type": "text/plain"});

					res.end("500 : INTERNAL ERROR");

				}

			});

		}

		

		function ProcessPage(page,args,libs,callback) { // FUNCTION TO PROCESS HTML PAGE FROM PHJS

			var file = fs.readFileSync(page, "UTF-8");

			var isphjs = 0;

			var htl = new Array();

			var ht = {};

			for (var i=0;i<file.length;i++) { // LOCATE NON PHJS CODE IN THE FILE

				if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] == "<?phjs") {

					isphjs = 1;

					if (typeof(ht.debut) != "undefined") {

						ht.fin = i;

						htl.push(ht);

					}

					ht = {};

					i += 5;

				} else if (file[i]+file[i+1] == "?>"){

					isphjs = 0;

					ht.debut = i+2;

					i += 1;

				} else if (i == 0) {

					ht.debut = 0;

				} else if (i == file.length-1 & isphjs == 0) {

					ht.fin = file.length;

					htl.push(ht);

				}

			}

			var newht;

			var oldlen;

			var dif = 0;

			for (var i=0;i<htl.length;i++) { // PUT ALL NON PHJS CODE IN 'ECHO' FUNCTION, 'ECHO' FUNCTION IS LIKE 'ECHO' IN PHP, TO GENERATE THE HTML PAGE

				htl[i].debut = htl[i].debut + dif;

				htl[i].fin = htl[i].fin + dif;

				newht = file.substring(htl[i].debut,htl[i].fin);

				file = (file.substring(0,htl[i].debut) + "\necho(`" + newht + "`); " + file.substring(htl[i].fin,file.length));

				dif += (("\necho(`" + newht + "`); ").length - newht.length);

			}

			var withPhjs = file.length;

			file = remplace(file,"<?phjs",""); // DROP PHJS TAGS FROM FILE

			file = remplace(file,"?>","");

			var withoutPhjs = file.length;

			if (withPhjs == withoutPhjs) {
				file += "\n--END--";
			}
			
			if (file.replace("--END--","") == file) {
				log(500,'ERROR',"\n MISSING --END-- IN "+page);
				callback("ERROR");
				return;
			}

			file = remplace(file,"--END--","\ncallback(PHJS.content,PHJS.session,PHJS.global,PHJS.code);");

			file = "function start(callback,PHJS,echo,echo_json) { var print = echo; \n"+file+" } module.exports = { start: start };" // PUT FILE IN A FUNCTION FOR EXECUTE HIS JAVASCRIPT CODE

			try {

				file = rfs(file); //TRY IMPORT FILE

			} catch(e) {

				log(500,'ERROR',"\nSyntax error when process '" + page + "' : \n" + util.format(e));

				callback("ERROR");

			}

			var PHJS = {code: 200, util: util, args: args, content: new Array(), libs: libs, cd: getPath(page), fileName: getFileName(page), ipsrc: ipsrc, session: req.session, global: GlobalVars, local: {},
						log: log,  errorLog: function(e) {
							PHJS.log(500,'ERROR',"\nError when process '"+PHJS.cd+"/"+PHJS.fileName+"' : \n"+PHJS.util.format(e))
						}, setCode: function(code) {
							PHJS.code = code;
						}, session_destroy: function() {
							for (var key in PHJS.session) {
								delete PHJS.session[key];
							}
						}, include: function(page,callback) {
							ProcessPageInclude(page,PHJS, (content,session,global,code) => {
								if (content != "ERROR") {
									for (var i=0;i<content.length;i++) {
										PHJS.content.push(content[i]);
									}
									PHJS.session = session;
									PHJS.global = global;
									PHJS.code = code;
								} else {
									PHJS.content.push({type: "html", chaine: "<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n"});
								}
								callback();
							});
						}};

			try { 

				file.start(function (content,session,global,code) { 

				   GlobalVars = global;

				   callback(content,session,code);

				},PHJS, function (chaine) { PHJS.content.push({type: "html", chaine: chaine + " \n"}) },function (objet) { PHJS.content.push({type: "json", chaine: objet}) }); // TRY EXECUTE FILE, PUT RESULT IN 'CONTENT' VARIABLE, AND RETURN IT

			} catch(e) {

				log(500,'ERROR',"\nExecution error when process '" + page + "' : \n" + util.format(e));

				callback("ERROR");

			}

		}



		function log(code,type,msg,err) {

			var date = new Date();

			var dst;

			var logfile;

			if (type == "INFO") {

				logfile = logaccess;

			} else if (type == "ERROR") {

				logfile = logerror;

			}

			dst = proto + "://" + req.headers.host + url.parse(req.url).pathname;

			if (req.method == "GET" & url.parse(req.url).query != null) {

				dst = dst + "?" + url.parse(req.url).query;

			}

			fs.appendFileSync(logfile, 

			(date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' => ' + remplace(req.connection.remoteAddress,'::ffff:','') + ' => ' + req.method + ' ' + dst + ' CODE ' + code + ' ; ' + req.headers['user-agent'] + ' ' + msg + '\n')); 

		}



	}

	

	var webserver = function (req,res) {

		laSession(req, res, function(){

			serverScript(req,res);

		});

	}

	

	if (proto == 'http') {

		var server = http.createServer(webserver);

	} else if (proto == 'https') {

		var server = https.createServer(options, webserver);

	}

	server.listen(port)

	if (conf.fastupload.active == "YES") {

		if (fs.existsSync(path + conf.fastupload.folder)) {

			console.log("\nStart FastUpload server on '" + path + conf.fastupload.folder + "'")

			var io = require('socket.io').listen(server);

			io.sockets.on('connection', function (socket) {

				//console.log("socket.io connected!");

				socket.downloaded = 0;

				socket.data = "";

				socket.handler = 0;

				socket.on('Upload', function (data){ // --------------------------------> UPLOAD D'UN FICHIER <---------------------------------------------------------)

					if (typeof(data) != "object") {

						socket.emit('repupload', { type: 'refused', raison: 'Incorrect variable'});

						logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"Incorrect variable",logerror);

					} else { 

						if (typeof(data.name) != "string" | typeof(data.size) != "number" | typeof(data.data) != "string") {

							socket.emit('repupload', { type: 'refused', raison: 'Error: incorrect variable'});

							if (typeof(data.name) == "string") {

								logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"Incorrect variable",logerror);

							} else {

								logupload(remplace(socket.handshake.address,"::ffff:",""),"filename not found","Incorrect variable",logerror);

							}

						} else {

							if (socket.handler == 0) {

								if(data.size >= conf.fastupload.maxsize) {

									socket.emit('repupload', {type: 'refused', raison: 'The file is too big'});

									logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"The file is too big",logerror);

								} else {

									data.ext = data.name.split(".")[data.name.split(".").length-1];

									//if (data.ext == "jpg" | data.ext == "png" | data.ext == "bmp" | data.ext == "jpeg" | data.ext == "gif" | data.ext == "tif" | data.ext == "tiff"){

										data.num = 1;

										while (fs.existsSync(path + conf.fastupload.folder + "/" + data.name.split(".")[0] + "-n" + data.num + "." + data.ext)) {

											data.num += 1;

										}

										socket.filename = data.name.split(".")[0] + "-n" + data.num + "." + data.ext

										socket.handler = fs.openSync(path + conf.fastupload.folder + "/" + socket.filename, 'a')

									/*} else {

										socket.emit('repupload', { type: 'refused', raison: "Ce n'est pas une image" });

										log(socket.pseudo,"Envoyer une image","Ce n'est pas une image",remplace(socket.handshake.address,"::ffff:",""));

									}*/

								}

							}

							if (socket.handler != 0) {

								if(data.size >= conf.fastupload.maxsize) {

									socket.emit('repupload', {type: 'refused', raison: 'The file is too big'});

								} else {

									socket.downloaded += data.data.length;

									socket.data += data.data;

									if(socket.downloaded >= data.size) { //If File is Fully Uploaded

										fs.write(socket.handler, socket.data, null, 'Binary', function(err, Writen){

											socket.emit('repupload', {'type': 'finish'});

											logupload(remplace(socket.handshake.address,"::ffff:",""),socket.filename,"File successfully uploaded ",logaccess);

											socket.handler = 0;

											socket.downloaded = 0;

											socket.filename = "";

											socket.data = "";

											//console.log("if 1");

										});

									} else if(socket.data.length > 1048576){ //If the Data Buffer reaches 10MB

										fs.write(socket.handler, socket.data, null, 'Binary', function(err, Writen){

											socket.data = ""; //Reset The Buffer

											socket.emit('repupload', { 'type': 'progress'

												      , 'place' :    socket.downloaded

												      , 'percent' :  (socket.downloaded / data.size) * 100});

										});

									} else {

										socket.emit('repupload', { 'type': 'progress'

												                 , 'place' :    socket.downloaded

												                 , 'percent' :  (socket.downloaded / data.size) * 100});

										//console.log("if 3");

										//console.log(socket.downloaded);

									}

								}  

							}

						}

					}

				});

			});

		} else {

			console.log("\n'" + conf.fastupload.folder + "' does not exist for FastUpload");

		}

	}

}



module.exports = StartServer;

