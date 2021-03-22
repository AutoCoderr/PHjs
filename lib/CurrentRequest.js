const fs = require('fs-extra'),
	rfs = require('require-from-string'),
	url = require('url'),
	util = require('util'),
	h = require('./Helpers');

class CurrentRequest {

	type;
	redirected;
	ext;
	page;
	req;
	pageExist;
	openInsteadPage;
	ipsrc;
	args;
	PHJSClass;
	PHJS;



	constructor(PHJSClass) {
		this.PHJSClass = PHJSClass;
	}

	//setters

	setType(type) {
		this.type = type;
	}
	setRedirected(redirected) {
		this.redirected = redirected;
	}
	setExt(ext) {
		this.ext = ext;
	}
	setPage(page) {
		this.page = page;
	}
	setReq(req) {
		this.req = req;
	}
	setPageExist(pageExist) {
		this.pageExist = pageExist;
	}
	setOpenInsteadPage(openInsteadPage) {
		this.openInsteadPage = openInsteadPage;
	}
	setIpsrc(ipsrc) {
		this.ipsrc = ipsrc;
	}
	setArgs(args) {
		this.args = args;
	}








	ProcessPageInclude(page, PHJSClass,callback, exportVariables) {
		if (page[0] != "/" & page[1]+page[2] != ":\\") {
			page = this.PHJS.cd + h.delimiter + page;
		}
		if (!fs.existsSync(page)) {
			callback(this.PHJS.code,["<font color='red' size='4'>'"+page+"' does not exist</font>\n"]);
		} else {
			if (fs.statSync(page).isDirectory()) {
				callback(this.PHJS.code,["<font color='red' size='4'>'"+page+"' is not a file</font>\n"]);
			} else {
				if (typeof(h.cacheFiles[page]) == "undefined") {
					h.cacheFiles[page] = {file: fs.readFileSync(page, "UTF-8")};

					if (!this.phjsFileToJsFunc(page,exportVariables)) {
						callback(500,null);
						return;
					}
				} else {
					let file = fs.readFileSync(page, "UTF-8");

					if (h.cacheFiles[page].file.length != file.length) {
						h.cacheFiles[page].file = file;
						if (!this.phjsFileToJsFunc(page,exportVariables)) {
							callback(500,null);
							return;
						}
					} else {
						for (let i=0;i<file.length;i++) {
							if (file[i] != h.cacheFiles[page].file[i]) {
								h.cacheFiles[page].file = file;
								if (!this.phjsFileToJsFunc(page,exportVariables)) {
									callback(500,null);
									return;
								}
								break;
							}
						}
					}
					let varsToPass = exportVariables ? this.PHJS.varsToPass : [];
					if (Object.keys(varsToPass).length !== Object.keys(h.cacheFiles[page].varstoPass).length) {
						if (!this.phjsFileToJsFunc(page,exportVariables)) {
							callback(500,null);
							return;
						}
					} else {
						for (let key in varsToPass) {
							if (typeof(h.cacheFiles[page].varstoPass[key]) == "undefined") {
								if (!this.phjsFileToJsFunc(page,exportVariables)) {
									callback(500,null);
									return;
								}
								break;
							}
						}
					}
				}

				let PHJS2 = new PHJSClass(this.PHJS.args,[],this.PHJS.header,this.PHJS.uri,this.PHJS.host,this.PHJS.referer,this.PHJS.libs,h.getPath(page),h.getFileName(page),this.PHJS.ipsrc,this.PHJS.session,this.PHJS.varsToPass,this.PHJS.global,this);


				h.cacheFiles[page].func.start(PHJS2).then(() => {
					callback(PHJS2.code,PHJS2.content);
				}).catch(e => { // TRY EXECUTE FILE, PUT RESULT IN 'CONTENT' VARIABLE, AND RETURN IT
					if (e != null) {
						this.log(500, 'ERROR', "\nExecution error when process '" + page + "' : \n" + this.PHJS.util.format(e));
						callback(500, null);
					}
				});
			}
		}
	}

	phjsFileToJsFunc(page, exportVariables = false) {

		let file = h.cacheFiles[page].file;

		let isphjs = false;

		let htl = [];

		let ht = {};

		let quote = false;

		for (let i=0;i<file.length;i++) { // LOCATE NON PHJS CODE IN THE FILE
			if ((file[i] === "'" || file[i] === "`" || file[i] === '"') && isphjs && file[i-1] !== "\\") {
				if (!quote) {
					quote = file[i];
				} else if (quote === file[i]) {
					quote = false;
				}
			}

			if ((file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] === "<?phjs" || file[i]+file[i+1]+file[i+2] === "<?=") && !quote) {
				if (isphjs) {
					this.log(500,'ERROR',"\nBad '<?phjs ?>' tags in '"+page+"'");
					return false;
				}

				isphjs = true;

				if (typeof(ht.debut) != "undefined") {

					ht.fin = i;

					htl.push(ht);

				}

				ht = {};

				i += file[i]+file[i+1]+file[i+2] === "<?=" ? 2 : 5;

			} else if (file[i]+file[i+1] === "?>" && !quote){
				if (!isphjs) {
					this.log(500,'ERROR',"\nBad '<?phjs ?>' tags in '"+page+"'");
					return false;
				}

				isphjs = false;

				ht.debut = i+2;

				i += 1;

			} else if (i === 0) {

				ht.debut = 0;

			} else if (i === file.length-1) {

				if (!isphjs) {
					ht.fin = file.length;

					htl.push(ht);
				} else if (quote !== false) {
					this.log(500,'ERROR',"\nquotes not finished in '"+page+"'");
					return false;
				}

			}

		}

		let newht;

		let dif = 0;

		for (let i=0;i<htl.length;i++) { // PUT ALL NON PHJS CODE IN 'ECHO' FUNCTION, 'ECHO' FUNCTION IS LIKE 'ECHO' IN PHP, TO GENERATE THE HTML PAGE

			htl[i].debut += dif;

			htl[i].fin += dif;

			newht = file.substring(htl[i].debut,htl[i].fin);

			file = (file.substring(0,htl[i].debut) + "\necho(`" + h.remplace(h.remplace(newht,"`","\\'"),"\\'","\\`") + "`); " + file.substring(htl[i].fin,file.length));

			dif += (("\necho(`" + h.remplace(h.remplace(newht,"`","\\'"),"\\'","\\`") + "`); ").length - newht.length);

		}

		for (let i=0;i<file.length;i++) {
			if (file[i]+file[i+1]+file[i+2] === "<?=") {
				let quote = false;
				let j = i+3;
				while(file[j]+file[j+1] !== "?>" || quote !== false) {
					if ((file[j] === "'" || file[j] === '"' || file[j] === "`") && (file[j-1] !== "\\" || !quote)) {
						if (!quote) {
							quote = file[j];
						} else if (file[j] === quote) {
							quote = false;
						}
					}
					j ++;
				}
				let toDispay = file.substring(i+3,j);
				let indexSoustract = 1;
				while (toDispay[toDispay.length-indexSoustract] === " ") {
					indexSoustract += 1;
				}
				if (toDispay[toDispay.length-indexSoustract] === ';') {
					toDispay = toDispay.substring(0, toDispay.length-indexSoustract);
				}
				file = file.substring(0,i+3)+"\necho("+toDispay+");"+file.substring(j,file.length);
			}
		}

		isphjs = false;
		quote = false;
		let thereIsACallback = false;
		for (let i=0;i<file.length;i++) {
			if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] === "<?phjs" || file[i]+file[i+1]+file[i+2] === "<?=" && !quote) {
				file = file.substring(0,i)+file.substring(i + (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] === "<?phjs" ? 6 : 3));
				isphjs = true;
			} else if (file[i]+file[i+1] === "?>" && !quote) {
				file = file.substring(0,i)+file.substring(i+2);
				isphjs = false;
			} else if ((file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5]+file[i+6] === "--END--" || file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4] === "end()") && !quote && isphjs) {
				if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5]+file[i+6] === "--END--") {
					file = file.substring(0, i) + "\nend();" + file.substring(i + 7);
				}
				thereIsACallback = true;
			} else if ((file[i] === "'" || file[i] === '"' || file[i] === "`") && isphjs) {
				if (!quote) {
					quote = file[i];
				} else if (file[i] === quote) {
					quote = false;
				}
			}
		}

		if (!thereIsACallback) {
			file += "\nend();"
		}

		for (let i=0;i<this.PHJSClass.functionInPhjs.length;i++) {
			const func = this.PHJSClass.functionInPhjs[i];
			file = "\nconst "+func+" = PHJS."+func+";\n"+file;
		}

		if (exportVariables) {
			for (let key in this.PHJS.varsToPass) {
				file = "\nconst "+key+" = PHJS.varsToPass."+key+";\n"+file;
			}
		}

		file = "\"use strict\"; function start(PHJS) { return new Promise((end) => { PHJS.setCallback(end);  \n"+file+"}); } module.exports = { start: start };"; // PUT FILE IN A FUNCTION FOR EXECUTE HIS JAVASCRIPT CODE

		let func;

		try {

			func = rfs(file); //TRY IMPORT FILE

		} catch(e) {

			this.log(500,'ERROR',"\nSyntax error when process '" + page + "' : \n" + util.format(e));

			return false;

		}

		h.cacheFiles[page].func = func;
		h.cacheFiles[page].varstoPass = {};
		if (exportVariables) {
			for (let key in this.PHJS.varsToPass) {
				h.cacheFiles[page].varstoPass[key] = true;
			}
		}

		return true;
	}

	log(code,type,msg) {

		const date = new Date();

		let dst;

		const logfile = h.equal(type,"info") ? h.logaccess : h.logerror;

		dst = h.proto + "://" + this.req.headers.host + url.parse(this.req.url).pathname;

		if (this.req.method == "GET" & url.parse(this.req.url).query != null) {

			dst = dst + "?" + url.parse(this.req.url).query;

		}

		const year = h.addMissingZero(date.getFullYear()),
			month = h.addMissingZero(date.getMonth()+1),
			day = h.addMissingZero(date.getDate()),
			hour = h.addMissingZero(date.getHours()),
			minute = h.addMissingZero(date.getMinutes()),
			second = h.addMissingZero(date.getSeconds());

		fs.appendFileSync(logfile,

			(year + '-' + month + '-' + day + "  " + hour + ':' + minute + ':' + second + ' => ' + this.ipsrc + ' => ' + this.req.method + ' ' + dst + ' CODE ' + code + ' ; ' + this.req.headers['user-agent'] + ' ' + msg + '\n'));

	}

}

module.exports = CurrentRequest;
