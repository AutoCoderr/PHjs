const o = require("./OtherFunctions.class"),
	rfs = require('require-from-string'),
	fs = require("fs-extra");

class PHJSClass {
	code;
	util;
	args;
	content;
	header;
	uri;
	host;
	libs;
	cd;
	fileName;
	ipsrc;
	session;
	includeVars;
	global;
	O;

	static functionInPhjs = [
		'echo',
		'echo_json',
		'include',
		'getJson',
		'getFile',
		'global_destroy',
		'session_destroy',
		'errorLog',
		'setHeader'
	];

	constructor(args,content,header,uri,host,libs,cd,fileName,ipsrc,session,includeVars,global,O) {
		this.code = 200;
		this.util = require("util");

		this.setArgs(args);
		this.setContent(content);
		this.header = header;
		this.setUri(uri);
		this.setHost(host);
		this.setLibs(libs);
		this.setCd(cd);
		this.setFileName(fileName);
		this.setIpsrc(ipsrc);
		this.setSession(session);
		this.setIncludeVars(includeVars);
		this.setGlobal(global);
		this.setO(O);
	}

	//setters

	setArgs(args) {
		this.args = args;
	}
	setContent(content) {
		this.content = content;
	}
	setUri(uri) {
		this.uri = uri;
	}
	setHost(host) {
		this.host = host;
	}
	setLibs(libs) {
		this.libs = libs;
	}
	setCd(cd) {
		this.cd = cd;
	}
	setFileName(fileName) {
		this.fileName = fileName;
	}
	setIpsrc(ipsrc) {
		this.ipsrc = ipsrc;
	}
	setSession(session) {
		this.session = session
	}
	setIncludeVars(includeVars) {
		this.includeVars = includeVars;
	}
	setGlobal(global) {
		this.global;
	}
	setO(O) {
		this.O = O;
	}
	//other functions
	setHeader(key,value){
		if (typeof(key) == "string" && typeof(value) == "string") {
			this.header[key] = value;
		} else if (typeof(key) == "object" && !(key instanceof Array)) {
			let obj = key;
			for (let key in obj) {
				this.header[key] = obj[key];
			}
		}
	}
	errorLog(e) {
		this.log(500,'ERROR',"\nError when process '"+this.cd+"/"+this.fileName+"' : \n"+this.util.format(e))
	}
	setCode(code) {
		this.code = code;
	}
	session_destroy = () => {
		for (let key in this.session) {
			delete this.session[key];
		}
	};
	global_destroy = () => {
		for (let key in this.global) {
			delete this.global[key];
		}
	};
	getFile = (path) => {
		if (path[0] !== "/") {
			path = this.cd + "/" + path;
		}
		return rfs(fs.readFileSync(path, "UTF-8"));
	};
	getJson = (path) => {
		if (path[0] !== "/") {
			path = this.cd + "/" + path;
		}
		return JSON.parse(fs.readFileSync(path, "UTF-8"));
	};
	include = (page,callback) => {
		this.O.ProcessPageInclude(page,this, PHJSClass, (code, content) => {
			if (code >= 200 & code < 300) {
				if (content != null) {
					for (let i=0;i<content.length;i++) {
						this.content.push(content[i]);
					}
				} else {
					this.O.log(500,'ERROR',"EMPTY CONTENT IN INCLUDE\n");
					this.content.push("<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n");
				}
			} else if (code<500 | code >= 600) {
				this.content.push("<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n");
			} else {
				this.content.push("<font color='red' size='4'>Error "+code+" in '"+page+"'</font><br/>\n");
			}
			content = undefined;
			if (typeof(callback) == "function") {
				callback();
			}
		});
	};

	echo = (chaine) => {
		this.content.push(chaine !== undefined && chaine !== null ? chaine.toString() : "");
	};

	echo_json = (objet) => {
		if (typeof(objet) !== "object") return;
		this.content.push(JSON.stringify(objet));
		this.setHeader("Content-Type", "application/json");
	};
}

module.exports = PHJSClass;
