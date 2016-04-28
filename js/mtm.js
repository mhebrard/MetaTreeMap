!(function() {

	var mtm = { version: "2.4.1" };
	var verbose=false;

	//VARIABLES//
	//need to compute json
	//functions merge, sumHits
	var ranks = ["no rank","superkingdom","kingdom","subkingdom","superphylum","phylum","subphylum","superclass","class","subclass","infraclass","superorder","order","suborder","infraorder","parvorder","superfamily","family","subfamily","tribe","subtribe","genus","subgenus","species group","species subgroup","species","subspecies","varietas","forma"];
	var config; //object configuration
	var root; //object root (all tree)
	var bkeys; //list of keys for bridges
	var bobjs; //list of node -object- for bridge
	

	var tree; //tree after depth cutOff
	var fluid; //tree displayed on treemap
	//neet to initiate layout
	//functions setLayout, computeLayout
	var node; //current node displayed
	var searchable; //list of taxa names for search
	var d3layout; //d3 layout
	var color=""; //color set for leaves
	var colors=[ //default set of colors
		["brewer","#8dd3c7,#ffffb3,#bebada,#fb8072,#80b1d3,#fdb462,#b3de69,#fccde5,#d9d9d9,#bc80bd,#ccebc5,#ffed6f"], 
		["d3","#1f77b4,#aec7e8,#ff7f0e,#ffbb78,#2ca02c,#98df8a,#d62728,#ff9896,#9467bd,#c5b0d5,#8c564b,#c49c94,#e377c2,#f7b6d2,#7f7f7f,#c7c7c7,#bcbd22,#dbdb8d,#17becf,#9edae5" ]
	];
	
	//need to update
	var w=1,h=1; //map dimentions
	var x,y; //d3 scales
	var kx=1,ky=1; //zoom ratio
	var touched=""; //node for touch event
	
	//CONSTRUCTORS//
	mtm.load = function(files,conf) {
		//container for dependencies
		if(!document.getElementById("mtm-mods")) {
			var s = document.createElement('div');
			s.id = "mtm-mods";
			var p = document.getElementsByTagName('body')[0];
			if(p.firstChild) { p.insertBefore(s,p.firstChild); }
			else { p.appendChild(s); }
		}
		//manage dependencies
		var queue = [];
		if (!window.jQuery) { //include jQ + bootstrap
			queue.push(scriptload("http://code.jquery.com/jquery-1.12.0.min.js")); 
			queue.push(linkload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css"));
			queue.push(scriptload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"));
		}
		else if (!$.fn.modal.Constructor.VERSION) { //include bootstrap
			queue.push(linkload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css"));
			queue.push(scriptload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js")); 
		}
		if(!window.d3) {queue.push(scriptload("https://d3js.org/d3.v3.min.js")); } //include d3
		
		//run
		Promise.resolve()
		.then(function(){ return Promise.all(queue);}) //run loading
		.catch(function(err){return Error("mtm.load.dependencies:",err);})
		.then(function(){ 
			console.log("mtm",mtm.version)
			console.log("jQ",jQuery.fn.jquery);
			console.log("bootstrap",$.fn.modal.Constructor.VERSION);
			console.log("d3",d3.version);
		}).catch(function(err) { return Error("mtm.load.versions:",err); })
		.then(function() {
			queue=[];
			if(!d3.select('#mtm-mods').attr("data-subs")) {
				d3.select('#mtm-mods').attr("data-subs",true)
	
				//font
				queue.push(linkload("http://fonts.googleapis.com/css?family=Source+Code+Pro:600"));
				//bootstrap-toogle
				queue.push(linkload("https://gitcdn.github.io/bootstrap-toggle/2.2.2/css/bootstrap-toggle.min.css"));
				queue.push(scriptload("https://gitcdn.github.io/bootstrap-toggle/2.2.2/js/bootstrap-toggle.min.js"));
				//bootstrap-select
				queue.push(linkload("https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.10.0/css/bootstrap-select.min.css"));
				queue.push(scriptload("https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.10.0/js/bootstrap-select.min.js"));
			}
			//include
			return Promise.all(queue);
		}).catch(function(err){return Error("mtm.load.modules:",err);})
		.then(function(){ return loadConf(conf); })
		.catch(function(err){return Error("mtm.load.config:",err);})
		.then(function() { 
			return Promise.all([setConfig(),setLayout()]);
		})
		.catch(function(err) { return Error("mtm.load.layout:",err); })
		.then(function() { return loadData(files); })
		.catch(function(err) { return Error("mtm.load.data:",err); })
		.then(function(load) { 
			console.log("load",load);
			//hundreds + sumHits
			load[0] = load.reduce(function(a,b) {return +a + +b;});
			sumHits(root,load);
			console.log("root",root);
			updateLayout();
		})
	}

	function scriptload(u) {
		return new Promise(function(ful) {
			var s = document.createElement('script');
			s.type = 'text/javascript';
			s.src = u;
			s.onload = function(){ return ful(u+" loaded");}
			document.getElementById('mtm-mods').appendChild(s);
		});
	}

	function linkload(u,id) {
		return new Promise(function(ful) {
			var s = document.createElement('link');
			s.rel = 'stylesheet';
			s.href = u;
			s.crossorigin = "anonymous";
			if(id) {s.id=id;}
			s.onload = function(){ return ful(u+" loaded");};
			document.getElementById('mtm-mods').appendChild(s);
		});
	} 

	function loadConf(conf) {
		return new Promise(function(ful) {
			if(conf) { 
				d3.json(conf.data,function(c) {
					config=c;
					return ful("config file loaded");
				})
			}
			else if (!config) { 
				d3.json("./mtm-config.json",function(c) {
					config=c;
					return ful("default config loaded");
				}) 
			}
			else {
				return ful("current config use");
			}
		})
	}

	function loadData(files) {
		//manages filesname
		d3.select("#mtm-samples").text("");
		var ul = d3.select("#mtm-samples").append("ul").attr("class","list-unstyled")

		var data = [];
		if(!files || files.length==0) { 
			data=["data/HuFS.json","data/HuFU.json"]; 
			ul.append("li").text("#1.HuFS.json");
			ul.append("li").text("#2.HuFU.json");
		}
		else {
			for(var i=0; i<files.length; i++) {
				ul.append("li").text("#"+(i+1)+"."+files[i].name);
				data.push(files[i].data);
			}
		}
		//root init.
		root={"name":"root","children":[],"data":{"hits":0,"rank":"no rank","sample":0,"color":"#888"},"id":"1"}; //skeleton tree
		bkeys = [root.id]; //list of keys of nodes
		bobjs = [root]; //list of node -object-
		var hundreds = []; //samples total reads
		//sequential merge
		var seq=Promise.resolve(hundreds);
		data.forEach(function(f,i) {
			seq = seq.then(function(h){
				return readData(f,i,h);
			})
		})
		//return global count	
		seq = seq.then(function(h) { return h; })
		return seq;
	}

	function readData(f,i,h) {
		return new Promise(function(ful) {
			d3.json(f, function(data) {
				h[i+1]=data.data.sum;
				merge(data,"",i+1) //Create skeleton and leaves (root,parent,sample)
				return ful(h);
			})
		})
	}

	mtm.save = function(mode) {
		//delete previous
		d3.select("#mtm-canvas").html("")
		
		if(mode=="json") {
			copy(root); //format tree for output
			//create file
			var url = 'data:text/json;charset=utf8;filename=output.json,' + encodeURIComponent(JSON.stringify(out));
			//Direct DownLoad call
			ddl("tree.json",url);
		}
		else if(mode=="svg") {
			var html = d3.select("svg")
				.attr("version", 1.1)
				.attr("xmlns", "http://www.w3.org/2000/svg")
				.attr(":xmlns:xlink", "http://www.w3.org/1999/xlink")
				.node().outerHTML

			var url = 'data:image/svg+xml;charset=utf8;filename=treemap.svg,' + encodeURIComponent(html);
			//Direct DownLoad call
			ddl("treemap.svg",url);
		}
		else if(mode=="png") {
			var svg = d3.select("svg");		
			//create canvas
			var canvas = d3.select("body").append("canvas")
				.attr("width",svg.attr("width"))
				.attr("height",svg.attr("height"))
				.style("display","none")
				.node()
			var context = canvas.getContext("2d");
			
			//add svg header
			var html = svg.attr("version", 1.1)
				.attr("xmlns", "http://www.w3.org/2000/svg")
				.attr(":xmlns:xlink","http://www.w3.org/1999/xlink")
				.node().outerHTML
				
			//img tag
			var image = new Image;
			image.onload = function() {
				//create file
				context.drawImage(image, 0, 0);
				var url = canvas.toDataURL().replace("image/png","application/octet-stream");
				//Direct DownLoad call
				ddl("treemap.png",url);
			};
			image.src = 'data:image/svg+xml;base64,'+ btoa(html);
		}
		else if(mode=="txt") {
			//header
			var string =  "Name\tTaxonomyID\tHits\tPercentage\tSample\tRank\n";
			//concatenate data 
			string = string + exportTab(root);
			//create file
			var url = 'data:text/tab-separated-values;charset=utf8;filename=table.txt,' + encodeURIComponent(string);
			//Direct DownLoad call
			ddl("table.txt",url);
		}
		else if(mode=="config") {
			//create file
			var url = 'data:text/json;charset=utf8;filename=mtm-config.json,' + encodeURIComponent(JSON.stringify(config));
			//Direct DownLoad call
			ddl("mtm-config.json",url);
		}
	}
	
	mtm.convertor = function(location) {
		//CONTAINER//
		var container = d3.select("#"+location) //container div
		var form = container.append("form")
		//datafile
		var li = form.append("div").attr("class","form-inline")
			.style("white-space","nowrap").style("overflow","hidden").style("text-overflow","ellipsis")
		li.append("label").text("data:").style("width","90px")
		s = li.append("label").attr("class","btn btn-default").attr("id","mtm-convert-data")
			//.style("width","90px")
		s.text("Browse...")
		s.append("input").attr("type","file").style("display","none").attr("id","mtm-convert")
			.attr("name","mtm-convertFile")
			.on("change",function(){
				d3.select("#mtm-convert-help").text(this.files[0].name);
			})
		$('#mtm-convert-data').on({ "click": function() {
	  		$("#"+location)[0].closable=false;
	  	} });
		li.append("label").attr("class","help-block small").attr("id","mtm-convert-help").style("display","inline")
		//json or tab
		li = form.append("div").attr("class","form-inline")
		li.append("label").text("format:").style("width","90px")
		var sub = li.append("label").attr("class","radio-inline")
		sub.append("input").attr("type","radio").property("checked",true)
			.attr("name","mtm-format").attr("value","json")
			.on("click",function(){format(this);})
		sub.append("span").text("Other.json")

		var sub = li.append("label").attr("class","radio-inline")
		sub.append("input").attr("type","radio")
			.attr("name","mtm-format").attr("value","tab")
			.on("click",function(){format(this);})
		sub.append("span").text("Tabular.txt")
		//
		/**/
		//fields title
		li = form.append("div").attr("class","form-inline")
		li.append("label").text("fields").style("width","90px")
		li.append("label").attr("id","mtm-fieldhead")
			.text("Object property")
		//id
		li = form.append("div").attr("class","form-inline")
		li.append("label").text("taxon id:").style("width","90px")
		li.append("input").attr("type","text")
			.attr("class","form-control")//.style("width","70px")
			.attr("name","mtm-tid").attr("value","id")
		//name
		li = form.append("div").attr("class","form-inline")
		li.append("label").text("taxon name:").style("width","90px")
		li.append("input").attr("type","text")
			.attr("class","form-control")//.style("width","70px")
			.attr("name","mtm-tname").attr("value","name")
		//hits
		li = form.append("div").attr("class","form-inline")
		li.append("label").text("hits:").style("width","90px")
		li.append("input").attr("type","text")
			.attr("class","form-control")//.style("width","70px")
			.attr("name","mtm-hits").attr("value","data.assigned")
		//header
		li = form.append("div").attr("class","form-inline")
			.attr("id","mtm-headrow").style("display","none")
		li.append("label").text("header:").style("width","90px")
		var sub = li.append("label").attr("class","checkbox-inline")
		sub.append("input").attr("type","checkbox")
			.attr("name","mtm-head").attr("value","false")
		sub.append("span").text("Ignore 1st line")
		//submit
		li = form.append("div").attr("class","form-inline")
		//li.append("label")//.style("width","70px")
		li.append("button").attr("class","btn btn-primary")
			.attr("type","button").style("width","90px")
			.text("Convert")
			.on("click",function(){convert();})
		

		//manage hide
		$("#"+location).on({
			"show.bs.modal":  function() { this.closable=true},
		 	"hide.bs.modal":  function() { if(!this.closable) {this.closable=true; return false;} else {return true;} }
		});
	}
	
	//SUB FUNCTIONS//
	//DATA STRUCTURE//
	function merge(n,p,s) {
			//Create skeleton tree and leaves with assigned hits
			//avoid space in id
			n.id = (""+n.id).replace(/\s+/g, '_');
			//avoid no rank
			if(n.data.rank=="no rank" && p != ""){ n.data.rank=p.data.rank;}
			
			//update skeleton
			var nsk; //skeleton node of n
			var idx = bkeys.indexOf(n.id);
			if(idx > -1) { // if node exist
				nsk=bobjs[idx]; //existing node
				
				//New branch is deeper, need rebase
				if(p!="" && ranks.indexOf(p.data.rank) > ranks.indexOf(nsk.parent.data.rank)) {
					//disconnect skeleton
					nsk.parent.children.splice(
						nsk.parent.children.indexOf(nsk),1
					);
					
					//connect with deeper
					var psk = bobjs[bkeys.indexOf(p.id)];
					psk.children.push(nsk);
				}
			}
			else { //else new skeleton node
				var psk=bobjs[bkeys.indexOf(p.id)];
				nsk = {"name":n.name,
					"children":[],
					"parent":psk,
					"data":{"hits":0,"rank":n.data.rank,"sample":0},
					"id":n.id
				};	
				psk.children.push(nsk);
				bkeys.push(nsk.id);
				bobjs.push(nsk);
			}
			
			//Add tag node
			if(n.data.assigned!="0"){
				var tag={"name":n.name+" #"+s,
					"children":[],
					"data":{"hits":+n.data.assigned,
						"rank":n.data.rank,
						"sample":s,
						"percent":+n.data.assigned*100/h[s]},
					"id":n.id
				}
				nsk.children.push(tag);
			}
			
			//recursive call
			if (n.children.length>0) {
				for (var i in n.children) {
					merge(n.children[i],n,s,h);
				}
			}
	}

	function sumHits(n,h) {
		n.data.count = h.map(function(m) {return 0;});
		//recursive call
		if (n.children.length>0) {
			for (var i in n.children) {
				var count = sumHits(n.children[i],h);
				for(var j in count) {
					n.data.count[j]+=count[j];
				}
			}
		}
		n.data.count[n.data.sample]+=n.data.hits;
		n.data.hits = n.data.count.reduce(function(t,c){return t+c;},0);
		n.data.percent=+n.data.hits*100/h[n.data.sample];
		return n.data.count;
	}

	//VIEW CREATION//
	function setConfig() {
		//check the choices and transform to boolean
		return new Promise(function(ful) {
			var vals = [];
			vals=["rugged","flat"];
			if(vals.indexOf(config.options.hierarchy) == 0) {config.options.hierarchy=true;}
			else if (vals.indexOf(config.options.hierarchy) == 1) {config.options.hierarchy=false;}

			vals=["fluid","sticky"];
			if(vals.indexOf(config.options.zoom) == 0) {config.options.zoom=true;}
			else if (vals.indexOf(config.options.zoom) == 1) {config.options.zoom=false;}

			vals=["sample","hits","taxon"]
			if(vals.indexOf(config.options.proportion) < 0)
			{ alert("please set config.options.proportion: "+vals.toString());}

			vals=["taxon","rank","sample","majority"]
			if(vals.indexOf(config.options.colored) < 0)
			{ alert("please set config.options.colored: "+vals.toString());}

			vals=["enable","disable"];
			if(vals.indexOf(config.options.ancestors) == 0) {config.options.ancestors=true;}
			else if (vals.indexOf(config.options.ancestors) == 1) {config.options.ancestors=false;}

			vals=["brewer","d3"];
			if(vals.indexOf(config.options.palette) == 0) {config.options.palette=colors[0][1];}
			else if (vals.indexOf(config.options.palette) == 1) {config.options.palette=colors[1][1];}

			vals=["black","white"];
			if(vals.indexOf(config.options.background) == 0) {config.options.background=true;}
			else if (vals.indexOf(config.options.background) == 1) {config.options.background=false;}

			vals=["taxon","rank","no"]
			if(vals.indexOf(config.options.labelled) < 0)
			{ alert("please set config.options.labelled: "+vals.toString());}

			ful("Config checked");
		})
	}

	function setLayout() {
		return new Promise(function(ful) {		
			//hidden divs
			if(!d3.select("#mtm-mods").attr("data-hidden")) {
				var mods = d3.select("#mtm-mods").attr("data-hidden",true);
				//style
				mods.append("style").attr("type","text/css").text(
						"<!--\t"
						+"#mtm-tip{position:absolute;z-index:3;background-color:#888;border:1px solid #000;border-radius:.2em;padding:3px;font-family:'Source Code Pro','Lucida Console',Monaco,monospace;font-size:14pt;pointer-events:none;opacity:0}\n"
						+"#mtm-table table{border-collapse:collapse;width:100%;}\n"
						+"\t-->"
					)
				//divs
				mods.append("div").attr("id","mtm-tip")
				mods.append("div").attr("id","mtm-canvas").style("display","none")
				mods.append("div").attr("id","mtm-samples").style("display","none")
				//pattern
				var ul = mods.append("div").attr("id","mtm-tags").attr("width","140px")
					.style("display","none").append("ul").attr("class","list-unstyled")
				ul.append("li").text("#N: name");
				ul.append("li").text("#I: id");
				ul.append("li").text("#H: hits");
				ul.append("li").text("#R: rank");
				ul.append("li").text("#S: sample");
				ul.append("li").text("#P: % by sample");
				ul.append("li").text("#V: % by view");

				//convert
				//Modal
				var modal = mods.append("div").attr("id","mtm-modal")
					.attr("class","modal fade")
					.append("div").attr("class","modal-dialog")
					.append("div").attr("class","modal-content")
				var head = modal.append("div").attr("class","modal-header")
				head.append("button").attr("class","close")
					.attr("type","button").attr("data-dismiss","modal")
					.append("span").html("&times;")
       			head.append("h4").attr("class","modal-title").attr("id","mtm-modal-title")
				var body = modal.append("div").attr("class","modal-body")
					.attr("id","mtm-modal-body")
			}

			//Delete previous views
			d3.selectAll(".mtm-container").html("")
			param={};
			tree=false;
			fluid=false;

			

			//build views
			if(config.bar) { bar(config.bar); }
			if(config.table && config.table.display) {
				param.table={};
				table(config.table,param.table);
				//updateLines();
			}
			if(config.treemap && config.treemap.display) {
				param.treemap={};
				//updateSearch();
				treemap(config.treemap,param.treemap);
			}

			ful("Layout ready");
		})
	}

	function updateLayout() {
		//manage cutOff
		refTree();

		if(config.table && config.table.display) {
			updateLines();
		}
		if(config.treemap && config.treemap.display) {
			updateSearch();
			if(config.options.zoom) {
				fluid = config.options.depth_rank!="init" ? tree : root ;
			}
		}

		var domain = d3layout.nodes().reduce(function(p,c) {if(p.indexOf(c.id)<0){p.push(c.id);}return p;}, []);
		color=d3.scale.ordinal().range(config.options.palette.split(/\s*,\s*/)).domain(domain);
		
		//update
		tree ? zoom(tree) : zoom(root);
		updateColor();

	}

	function refTree() {
		//compute tree: root or cutOff
		if(config.options.depth_rank!="init") {
			var rank = ranks.indexOf(config.options.depth_rank);
			var rankN = ranks.indexOf(root.data.rank);
			//check depth > n.rank
			if(rank <= rankN) { 
				rankN++; 
				config.options.depth_rank = ranks[rankN];
			}
			tree = cutTree(rank,root,root);
			computeLayout(tree);
			searchable = d3layout.nodes().slice(0); //clone
		}
		else { 
			computeLayout(root);
			searchable = d3layout.nodes().slice(0); //clone
		}
	}
	
	function computeLayout(n) {
		if(config.treemap.display) {
			h = config.treemap.height - 20;  //margin top
			w = config.treemap.width - 1; //margin left
		}
		//compute final json tree
		d3layout = d3.layout.treemap() //array of all nodes
			.size([w, h]) //size of map
			.round(false) //round the value (for scale)
			.sticky(true) //keep child position when transform
			.padding(function(){return config.options.hierarchy ? 2 : 0;})
			.value(setMode(config.options.proportion))

		var nodes = d3layout.nodes(n)
		
		//scale from data to map
		x = d3.scale.linear().range([0, w]);
		y = d3.scale.linear().range([0, h]);

		if(verbose){console.log("nodes",nodes.length,"leaves",nodes.filter(function(d){return !d.children;}).length,"root.value",root.value);}
	}

	function cutTree(r,p,n){
		//r is the rank we need
		//p is the root
		//n is the current node. Test on n.children
		//clone n
		var clone = {"name":n.name,
				"children":[],
				"data":{"hits":+n.data.hits,
					"rank":n.data.rank,
					"sample":n.data.sample,
					"percent":n.data.percent,
					"color":n.data.color,
					"count":n.data.count.slice(0)},
				"id":n.id
			};
		//selected rank
		if(ranks.indexOf(n.data.rank)==r) {
			addLeaves(clone,p,n.data.count)
		}
		else {//test children
			var count = n.data.count.map(function(c){return 0;})
			if(n.children && n.children.length>0) {
				for (var i in n.children) {
					if(n.children[i].data.sample==0) {//skeleton
						var rankC=ranks.indexOf(n.children[i].data.rank);
						if(rankC>r) { //add sub count
							count = count.map(function(c,j){return c+n.children[i].data.count[j];})
						}
						else { clone.children.push(cutTree(r,p,n.children[i]));}
					}
					else { //leaf
						count[n.children[i].data.sample]+=n.children[i].data.hits;
					}
				}
				//create leaves
				addLeaves(clone,p,count)
			}
		}
		return clone;
	}

	function addLeaves(n,p,count) {
		for(var i in count) {
			if(count[i]>0) {
				n.children.push({
					"name":n.name+" #"+i,
					"id":n.id,
					"children":[],
					"data":{
						"hits":count[i],
						"rank":n.data.rank,
						"sample":i,
						"percent":count[i]*100/p.data.count[i],
						"color":n.data.color,
						"count":n.data.count.map(function(c,j) { return j==i ? c : 0; })

						//n.data.percent=+n.data.hits*100/h[n.data.sample];
					}
					
				})
			}
		}
	}
	
	function setMode(confMode) {
		var mode;
		if(confMode=="sample") { mode=sizeNorm; }
		else if(confMode=="hits") { mode=sizeHits; }
		else if(confMode=="taxon") { mode=sizeNodes;}
		else {console.log("ERROR: unvalide size mode"); mode=sizeNorm; }
		return mode;
	}
	
	function sizeNorm(d) { return d.data.percent; }
	function sizeHits(d) { return d.data.hits; } 
	function sizeNodes(d) { return 1; }

	//LAYOUTS//
	function bar(c) {
		if(verbose){console.time("bar");}
		//create menu bar//
		var menu;
		if(c.display) {
			menu = d3.select("#"+c.location)
				.classed("mtm-container",true)
				.style("text-align","center")
				.append("div")
				.classed("mtm-menu",true)
				.style("width",c.width+"px")
				.style("display","inline-block")
		}
		else { 
			menu = d3.select("body")
				.append("div")
				.classed("mtm-menu",true)
				.style("display","none")
		}
		
		var cont = menu.append("nav").attr("class","navbar navbar-default")
		.append("div").attr("class","container-fluid")

		var list = cont.append("div").attr("class","navbar-header")
		//collapsed button
		var item = list.append("button").attr("type","button").attr("class","navbar-toggle collapsed")
		.attr("data-toggle","collapse").attr("data-target","#mtm-barmenu")
		item.append("span").attr("class","icon-bar")
		item.append("span").attr("class","icon-bar")
		item.append("span").attr("class","icon-bar")
		//info
		list.append("button").attr("type","button").attr("class","btn btn-default navbar-brand").attr("id","mtm-info")
		.append("span").attr("class","glyphicon glyphicon-info-sign")
    	$("#mtm-info").popover({
	        html : true, 
	        content: function() { return $('#mtm-samples').html(); },
	        title: "Samples:"
   		});
   		$("#mtm-info").tooltip({ 
	        placement: "bottom",
	        title: "Click to see samples names"
   		});
   		$('#mtm-info').on({
		  "click":	function() { $('#mtm-info').tooltip("hide"); }
		});

    	//Bar content
		list = cont.append("div").attr("class","collapse navbar-collapse")
		.attr("id","mtm-barmenu")
		.append("ul").attr("class","nav navbar-nav")

		//Import
		item = list.append("li").attr("class","dropdown mtm-dropdown").attr("id","mtm-bar-import")
		item.append("a").attr("href","#")
		.attr("class","dropdown-toggle").attr("data-toggle","dropdown")
		.html("Import <span class='caret'></span>")
		ul = item.append("ul").attr("class","dropdown-menu")
			.style("width","250px").style("padding","5px")

		//Data
		li = ul.append("li").attr("class","form-inline")
			.style("white-space","nowrap").style("overflow","hidden").style("text-overflow","ellipsis")
		li.append("label").text("data:").style("width","70px")
		s = li.append("label").attr("class","btn btn-default").attr("id","mtm-data-btn")
			.style("width","90px")
		s.text("Browse...")
		s.append("input").attr("type","file").style("display","none").attr("id","mtm-data-input")
			.attr("name","dataFiles[]").property("multiple",true)
			.on("change",function(){
				var names=[];
				for (var i=0; i<this.files.length;i++) {
					names.push(this.files[i].name);
				}
				d3.select("#mtm-data-help").text(names.join(","));
			})
		$('#mtm-data-btn').on({ "click": function() {
	  		$('#mtm-bar-import')[0].closable=false;
	  	} });
		li.append("label").attr("class","help-block small").attr("id","mtm-data-help").style("display","inline")

		//Config
		li = ul.append("li").attr("class","form-inline")
			.style("white-space","nowrap").style("overflow","hidden").style("text-overflow","ellipsis")
		li.append("label").text("config:").style("width","70px")
		s = li.append("label").attr("class","btn btn-default").attr("id","mtm-config-btn")
			.style("width","90px")
		s.text("Browse...")
		s.append("input").attr("type","file").style("display","none").attr("id","mtm-config-input")
			.attr("name","confFiles[]").property("multiple",true)
			.on("change",function(){
				var names=[];
				for (var i=0; i<this.files.length;i++) {
					names.push(this.files[i].name);
				}
				d3.select("#mtm-config-help").text(names.join(","));
			})
		$('#mtm-config-btn').on({ "click": function() {
	  		$('#mtm-bar-import')[0].closable=false;
	  	} });
		li.append("label").attr("class","help-block small").attr("id","mtm-config-help").style("display","inline")

		//load
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","70px")
		li.append("button").attr("class","btn btn-primary")
			.attr("type","button").style("width","90px")
			.text("Load")
			.on("click",function(){
				var files = d3.select("#mtm-data-input").node().files
				var data = [];
				for(var i=0; i<files.length; i++) {
					data.push({name:files[i].name,data:URL.createObjectURL(files[i])});
				}
		
				//manage config
				var files = d3.select("#mtm-config-input").node().files
				var conf="";
				if(files[0]) { conf = {name:files[0].name,data:URL.createObjectURL(files[0])}; }
				
				//call
				mtm.load(data,conf);
			})
		li = ul.append("li").attr("class","divider")

		//Convert
		li = ul.append("li").attr("class","form-inline")
		li.append("label").text("convert:").style("width","70px")
		s = li.append("label").attr("class","btn btn-default").attr("id","mtm-convert")
			.style("width","90px")
			.attr("data-toggle","modal").attr("data-target","#mtm-modal")
		s.text("Format...")
		
		$('#mtm-convert').on({ "click": function() {
	  		$('#mtm-bar-import')[0].closable=false;
	  		updateModal("convert");
	  	} });

		//Colors
		item = list.append("li").attr("class","dropdown mtm-dropdown").attr("id","mtm-bar-colors")
		item.append("a").attr("href","#")
		.attr("class","dropdown-toggle").attr("data-toggle","dropdown")
		.html("Colors <span class='caret'></span>")
		var ul = item.append("ul").attr("class","dropdown-menu")
			.style("width","290px").style("padding","5px")
		//Colored
		var li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","100px").text("colored:")
		var s = li.append("select").attr("class","form-control").attr("id","mtm-bar-colored")
		.style("width","120px")
			s.append("option").attr("value","taxon").text("by taxon")
			s.append("option").attr("value","rank").text("by rank")
			s.append("option").attr("value","sample").text("by sample")
			s.append("option").attr("value","majority").text("by majority")
			//value
			s.property("value",config.options.colored)
			s.on("change",function() { 
				//change all button
				config.options.colored=this.value;
				d3.select("#mtm-bar-colored-block").classed("in",function(){ return config.options.colored=="rank" ? true : false;})
				//action
				updateColor();
			});
		$('#mtm-bar-colored').on({
		  "click":	function() { $('#mtm-bar-colors')[0].closable=false;}
		});
		//By rank block
		li = ul.append("li").attr("class","collapse").attr("id","mtm-bar-colored-block")
		//select rank
		var block = li.append("div").attr("class","form-inline")
		block.append("label").style("width","100px").text("rank:")
		s = block.append("select").attr("class","form-control").attr("id","mtm-bar-colored-rank")
			s.append("option").attr("value","init").text("--Phylogenic rank--")
			for (var k in ranks) { s.append("option").attr("value",ranks[k]).text(ranks[k]) }
			//value
			s.property("value",config.options.colored_rank)
			s.on("change",function() { 
				//change all button
				config.options.colored_rank=this.value;
				//action
				updateColor();
			});
		$('#mtm-bar-colored-rank').on({
		  "click":	function() { $('#mtm-bar-colors')[0].closable=false;}
		});
		//gray upper
		block = li.append("div").attr("class","form-inline")
		block.append("label").style("width","100px").text("ancestors:")
		block.append("input").attr("type","checkbox").attr("id","mtm-bar-ancestors")
		.attr("data-toggle","toggle").attr("data-on","enable").attr("data-off","disable")
		.attr("data-width","80")
		.property("checked",function() { return config.options.ancestors; })
		$('#mtm-bar-ancestors').on({ "change": function() { 
	  		$('#mtm-bar-colors')[0].closable=false;
	  		//change all button
			config.options.ancestors=d3.select("#mtm-bar-ancestors").property("checked");
			//action
			updateColor();
	  	} });
	  	li = ul.append("li").attr("class","divider")
		//Palette
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","100px").text("palette:")
		s = li.append("select").attr("class","form-control").attr("id","mtm-bar-palette")
		.style("width","120px")
		for (var k in colors) { s.append("option").attr("value",colors[k][1]).text(colors[k][0]) }
		s.property("value",config.options.palette)
			s.on("change",function() { 
				//change all button
				config.options.palette=this.value;
				//action
				color=d3.scale.ordinal().range(config.options.palette.split(/\s*,\s*/))
				updateColor(); 
			});
		$('#mtm-bar-palette').on({
		  "click":	function() { $('#mtm-bar-colors')[0].closable=false;}
		});
		//BG
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","100px").text("background:")
		li.append("input").attr("type","checkbox").attr("id","mtm-bar-background")
		.attr("data-toggle","toggle").attr("data-on","black").attr("data-off","white")
		.attr("data-width","80")
		.property("checked",function() { return config.options.background; })
		$('#mtm-bar-background').on({ "change": function() { 
	  		$('#mtm-bar-colors')[0].closable=false;
	  		//change all button
			config.options.background=d3.select("#mtm-bar-background").property("checked");
			//action
			d3.selectAll(".mtm-bg").attr("fill",function() {return config.options.background ? "#000" : "#FFF"; })
			d3.selectAll(".mtm-header rect").style("stroke",function() {return config.options.background ? "#000" : "#FFF"; })
			d3.selectAll(".mtm-view rect").style("stroke",function() {return config.options.background ? "#000" : "#FFF"; })
			d3.select("#mtm-table").style("background-color",function() {return config.options.background ? "#000" : "#FFF"; })
	  	} });

		//Labels
		item = list.append("li").attr("class","dropdown mtm-dropdown").attr("id","mtm-bar-labels")
		item.append("a").attr("href","#")
		.attr("class","dropdown-toggle").attr("data-toggle","dropdown")
		.html("Labels <span class='caret'></span>")
		ul = item.append("ul").attr("class","dropdown-menu")
			.style("width","270px").style("padding","5px")
		//labelled
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","80px").text("labelled:")
		s = li.append("select").attr("class","form-control").attr("id","mtm-bar-labelled")
			.style("width","120px")
			s.append("option").attr("value","taxon").text("by taxon")
			s.append("option").attr("value","rank").text("by rank")
			s.append("option").attr("value","no").text("no label")
			//value
			s.property("value",config.options.labelled)
			s.on("change",function() { 
				//change all button
				config.options.labelled=this.value;
				d3.select("#mtm-bar-labelled-block").classed("in",function(){ return config.options.labelled=="rank" ? true : false;})
				//action
				updatePaths(node);
			});
		$('#mtm-bar-labelled').on({
		  "click":	function() { $('#mtm-bar-labels')[0].closable=false;}
		});
		//By rank block
		li = ul.append("li").attr("class","collapse").attr("id","mtm-bar-labelled-block")
		//select rank
		block = li.append("div").attr("class","form-inline")
		block.append("label").style("width","80px").text("rank:")
		s = block.append("select").attr("class","form-control").attr("id","mtm-bar-labelled-rank")
			s.append("option").attr("value","init").text("--Phylogenic rank--")
			for (var k in ranks) { s.append("option").attr("value",ranks[k]).text(ranks[k]) }
			//value
			s.property("value",config.options.labelled_rank)
			s.on("change",function() { 
				//change all button
				config.options.labelled_rank=this.value;
				//action
				updatePaths(node);
			});
		$('#mtm-bar-labelled-rank').on({
		  "click":	function() { $('#mtm-bar-labels')[0].closable=false;}
		});
	  	li = ul.append("li").attr("class","divider")
		//Pattern
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","80px").text("pattern:")
		block = li.append("div").attr("class","input-group")
		block.append("input").attr("class","form-control").attr("id","mtm-bar-pattern")
			.attr("type","text").style("width","120px")
			.property("value",config.options.pattern)
			.on("change",function() { 
				console.log("on change");
				//change all button
				config.options.pattern=this.value;
				//action
				updatePaths(node); 
			});
			$('#mtm-bar-pattern').on({
			  "click":	function() { $('#mtm-bar-labels')[0].closable=false;}
			});
		block.append("div").attr("class","input-group-btn")
			.append("button").attr("type","button").attr("class","btn btn-default").attr("id","mtm-pattern")
			.append("span").attr("class","glyphicon glyphicon-info-sign")
		$('#mtm-pattern').on({
		  "click":	function() {
		  		$('#mtm-pattern').tooltip("hide");
		  	 	$('#mtm-bar-labels')[0].closable=false;}
		});
		$("#mtm-pattern").popover({
	        html : true, 
	        content: function() { return $('#mtm-tags').html(); },
	        title: "Tags:",
	        container: "#mtm-barmenu"
   		});
   		$("#mtm-pattern").tooltip({ 
	        placement: "bottom",
	        container: "#mtm-barmenu",
	        title: "Click to see a list allowed tags"
   		});

		//Font
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","80px").text("font size:")
		s = li.append("select").attr("class","form-control").attr("id","mtm-bar-font")
			.style("width","120px")
			for (var i=8; i<40; i=i+2) { s.append("option").attr("value",i).text(i); }
			//value
			s.property("value",config.options.font)
			s.on("change",function() { 
				//change all button
				config.options.font=this.value;
				//action
				d3.select("#mtm-treemap").style("font-size",config.options.font+"px")
				d3.select("#mtm-table").style("font-size",config.options.font+"px")
				d3.select("#mtm-tip").style("font-size",config.options.font+"px")
			});
		$('#mtm-bar-font').on({
		  "click":	function() { $('#mtm-bar-labels')[0].closable=false;}
		});

		//Treemap
		item = list.append("li").attr("class","dropdown mtm-dropdown").attr("id","mtm-bar-treemap")
		item.append("a").attr("href","#")
		.attr("class","dropdown-toggle").attr("data-toggle","dropdown")
		.html("Treemap <span class='caret'></span>")
		ul = item.append("ul").attr("class","dropdown-menu")
			.style("width","280px").style("padding","5px")

		//Hierarchy
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","90px").text("hierarchy:")
		li.append("input").attr("type","checkbox").attr("id","mtm-bar-hierarchy")
		.attr("data-toggle","toggle").attr("data-on","rugged").attr("data-off","flat")
		.attr("data-width","80")
		.property("checked",function() { return config.options.hierarchy;})
		$('#mtm-bar-hierarchy').on({ "change": function() { 
	  		$('#mtm-bar-treemap')[0].closable=false;
	  		//change all button
			config.options.hierarchy=d3.select("#mtm-bar-hierarchy").property("checked");
			//action
			d3layout.padding(function(){return config.options.hierarchy ? 2 : 0;})
			tree ? d3layout.nodes(tree) : d3layout.nodes(root) ;
			zoom(node);
	  	} });
		//Zoom
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","90px").text("zoom:")
		li.append("input").attr("type","checkbox").attr("id","mtm-bar-zoom")
		.attr("data-toggle","toggle").attr("data-on","fluid").attr("data-off","sticky")
		.attr("data-width","80")
		.property("checked",function() { return config.options.zoom;})
		$('#mtm-bar-zoom').on({ "change": function() { 
	  		$('#mtm-bar-treemap')[0].closable=false;
	  		//change all button
			config.options.zoom=d3.select("#mtm-bar-zoom").property("checked");
			//action
			if(config.options.zoom) { fluid = tree ? tree : root ; }
			else {
				fluid=false;
				tree ? computeLayout(tree) : computeLayout(root) ;
			}
			zoom(node);
	  	} });
		//Proportion
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","90px").text("proportion:")
		s = li.append("select").attr("class","form-control").attr("id","mtm-bar-proportion")
			.style("width","120px")
			s.append("option").attr("value","sample").text("by sample")
			s.append("option").attr("value","hits").text("by hits")
			s.append("option").attr("value","taxon").text("by taxon")
			//value
			s.property("value",config.options.proportion)
			s.on("change",function() { 
				//change all button
				config.options.proportion=this.value;
				//action
				d3layout.value(setMode(config.options.proportion))
				tree ? d3layout.nodes(tree) : d3layout.nodes(root) ;
				zoom(node);
			});
		$('#mtm-bar-proportion').on({
		  "click":	function() { $('#mtm-bar-treemap')[0].closable=false;}
		});
		//Depth
		li = ul.append("li").attr("class","form-inline")
		li.append("label").style("width","90px").text("depth:")
		var s = li.append("select").attr("class","form-control").attr("id","mtm-bar-depth-rank")
			s.append("option").attr("value","init").text("--Phylogenic rank--")
			for (var k in ranks) { s.append("option").attr("value",ranks[k]).text(ranks[k]) }
			//value
			s.property("value",config.options.depth_rank)
			s.on("change",function() { 
				//change all button
				config.options.depth_rank=this.value;
				console.log("change",config.options.depth_rank);
				//action
				refTree();
				updateLines();
				updateSearch();
				if(config.options.zoom) {
					fluid = config.options.depth_rank!="init" ? tree : root ;
				}
				//update
				console.log(ranks.indexOf(config.options.depth_rank),">=",ranks.indexOf(node.data.rank));
				if(ranks.indexOf(config.options.depth_rank) >= ranks.indexOf(node.data.rank)) {
					console.log("if");
					zoom(d3layout.nodes().filter(function(n){return ""+n.id+n.data.sample == ""+node.id+node.data.sample;})[0]);
				}
				else {
					config.options.depth_rank!="init" ? zoom(tree) : zoom(root) ;
				}
				updateColor();
			});
		$('#mtm-bar-depth-rank').on({
		  "click":	function() { $('#mtm-bar-treemap')[0].closable=false;}
		});

		//Zoom out
		li = list.append("li").append("div").attr("class","form-inline")
			.append("div").attr("class","btn-group")
		li.append("button").attr("type","button").attr("class","btn btn-default navbar-btn")
			.on("click",function(){return config.options.depth_rank!="init" ? zoom(tree) : zoom(root) ;})
			.attr("data-toggle","tooltip").attr("data-placement","bottom").attr("data-container","#mtm-barmenu").attr("title","zoom to root")
			.append("span").attr("class","glyphicon glyphicon-step-backward")
		li.append("button").attr("type","button").attr("class","btn btn-default navbar-btn")
			.on("click",function(){return node.parent ? zoomSkip(node.parent) : zoom(node) ;})
			.attr("data-toggle","tooltip").attr("data-placement","bottom").attr("data-container","#mtm-barmenu").attr("title","zoom to parent node")
			.append("span").attr("class","glyphicon glyphicon-backward")

		//search
		li = list.append("li").append("div").attr("class","navbar-form form-inline")
			.append("div").attr("class","input-group")
		li.append("div").attr("class","input-group-addon")
			.attr("data-toggle","tooltip").attr("data-placement","bottom").attr("title","zoom to selected node")
			.append("span").attr("class","glyphicon glyphicon-search")
		var s = li.append("select").attr("class","selectpicker").attr("data-live-search","true").attr("data-width","120px")
			s.on("change",function() { 
				//action
				zoom(searchable[this.value]);
			});

	  	//Export
		item = list.append("li").attr("class","dropdown mtm-dropdown").attr("id","mtm-bar-export")
		item.append("a").attr("href","#")
		.attr("class","dropdown-toggle").attr("data-toggle","dropdown")
		.html("Export <span class='caret'></span>")
		ul = item.append("ul").attr("class","dropdown-menu")
			.style("width","160px").style("padding","5px")

		//json
		li = ul.append("li").append("a").attr("href","#")
			.text("tree.json")
			.on("click",function(){return mtm.save("json");})
		//svg
		li = ul.append("li").append("a").attr("href","#")
			.text("treemap.svg")
			.on("click",function(){return mtm.save("svg");})
		//png
		li = ul.append("li").append("a").attr("href","#")
			.text("treemap.png")
			.on("click",function(){return mtm.save("png");})
		//txt
		li = ul.append("li").append("a").attr("href","#")
			.text("table.txt")
			.on("click",function(){return mtm.save("txt");})
		//config
		li = ul.append("li").append("a").attr("href","#")
			.text("mtm-config.json")
			.on("click",function(){return mtm.save("config");})
	
		//About
		item = list.append("li").attr("class","dropdown mtm-dropdown").attr("id","mtm-bar-about")
		item.append("a").attr("href","#")
		.attr("class","dropdown-toggle").attr("data-toggle","dropdown")
		.html("About <span class='caret'></span>")
		ul = item.append("ul").attr("class","dropdown-menu")
			.style("width","160px").style("padding","5px")

		//guide
		li = ul.append("li").append("a").attr("href","html/documentation.htm")
			.attr("target","mtm-doc").text("User Guide")//.style("width","70px")
		//feedback
		li = ul.append("li").append("a").attr("href","html/feedback.htm")
			.attr("target","mtm-feedback").text("Feedback")//.style("width","70px")
		//examples
		li = ul.append("li").append("a").attr("href","#")
			.attr("data-toggle","modal").attr("data-target","#mtm-modal")
			.text("Examples")//.style("width","70px")
			.on("click",function(){return updateModal("examples");})
		//about
		li = ul.append("li").append("a").attr("href","#")
			.attr("data-toggle","modal").attr("data-target","#mtm-modal")
			.text("About MTM")//.style("width","70px")
			.on("click",function(){return updateModal("about");})

		//activate toogles
		$(function() { $('[data-toggle="toggle"]').bootstrapToggle(); })
		$(function () { $('[data-toggle="popover"]').popover();})
		$(function () { $('[data-toggle="tooltip"]').tooltip();})
		$(function () { $('.selectpicker').selectpicker();})
		//manage hide
		$('.mtm-dropdown').on({
			"show.bs.dropdown":  function() { this.closable=true},
		 	"hide.bs.dropdown":  function() { if(!this.closable) {this.closable=true; return false;} else {return true;} }
		});

		if(verbose){console.timeEnd("bar");}
	}
		
	function treemap(c,p) {
		if(verbose){console.time("treemap");}
		//CONTAINER//
		//create container div//
		var container = d3.select("#"+c.location) //container div
			.classed("mtm-container",true)
			.style("text-align","center")
			
		//Menu//
		//if(c.options) {
		//	bar(config.bar,c.location,c.width);
		//}
		
		//SVG//
		var svg = container.append("svg") //general SVG
				.attr("id","mtm-treemap")
				.attr("height", c.height)
				.attr("width", c.width)
				.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")			
				.style("font-size",config.options.font+"px")
				.style("display","inline-block")//disable bottom padding
				.style("position","relative")
				.style("z-index","1") //View is below
		
		//backgroung
		svg.append("rect")
			.attr("width","100%")
			.attr("height","100%")
			.attr("fill",function() {return config.options.background ? "#000" : "#FFF"; })
			.attr("class","mtm-bg")
		
		//group for visual elements
		svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-view",true)

		//group for labels//
		svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-labels",true)

		//group for header (current zoom)//
		var header = svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-header",true)
		//create visual element rect
		header.append("rect")
			//.datum(node)
			.attr("y", -20) //child of root g, moved on margin.top
			.attr("width", c.width - 1)
			.attr("height", 20-1) //border-bottom
			.style("fill","#888")
			.style("stroke",function() {return config.options.background ? "#000" : "#FFF"; })
			.style("cursor","pointer")
			//.on('mouseover', function(d){ tip("show",d); })
			//.on('mouseout', function(d){ tip("hide",d); })
			//.on("touchstart", handleTouch)
			//.on("mousemove", function(d) { tip("move"); })
		//create text element
		header.append("text")
			.attr("x", 6)
			.attr("y", -18)
			.attr("dy", ".75em")
			.style("pointer-events","none")
			.text("Data loading...")
		
		//rect for highlight//
		svg.append("rect")
			.classed("mtm-hl",true)
			.style("stroke","#000")
			.style("stroke-width","5")
			.style("fill","none")
			.style("pointer-events","none")
		if(verbose){console.timeEnd("treemap");}
	}
	
	function table(c,p) {
		if(verbose){console.time("table");}		
		var container = d3.select("#"+c.location) //container div
			.classed("mtm-container",true)
			.style("text-align","center")
		
		//table//
		var tab=container.append("div")
				.attr("id","mtm-table")
				.style("height", c.height)
				.attr("width", c.width)
				.style("overflow","auto")
				.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")			
				.style("font-size",config.options.font+"px")
				.style("background-color",function() {return config.options.background ? "#000" : "#FFF"; })
				.style("display","inline-block")
				.style("position","relative")
				.style("z-index","1") //view is below(1)
				
		//thead
		var thead = tab.append("div")
			.style("background-color","#888")
			.append("table")
			.append("tr")
			.classed("mtm-header",true)
		thead.append("th").text("Node")
		thead.append("th").style("width","70px").style("text-align","right").text("Taxon_ID")
		thead.append("th").style("width","60px").style("text-align","right").text("Hits")
		thead.append("th").style("width","60px").style("text-align","right").text("%/View")
		thead.append("th").style("width","80px").style("text-align","right").html("%/Sample&nbsp;")
		thead.append("th").style("width","130px").style("text-align","left").text("Rank")
		thead.append("th").style("width","15px").text("")//scroll bar

		//tbody
		var view = tab.append("div")
			.style("height",(c.height-thead.node().offsetHeight)+"px")
			.style("width", c.width+"px")
			.style("overflow","auto")
			.attr("class","mtm-scrollable")
			.append("table")
			.classed("mtm-view",true)
			.classed("mtm-labels",true)
			.style("table-layout","fixed")

		if(verbose){console.timeEnd("table");}				
	}
	
	function tip(state,d) {
		if(state=="show") {
			d3.select("#mtm-tip")
				.datum(d)
				.style("opacity",1)
				.html(function(d) {
					return d.name+"<br/>Taxonomy ID: "+(+d.id > 0 ? d.id :"")
						+"<br/>Rank: "+d.data.rank
						+"<br/>"+d.data.hits+" hits"
						+"<br/>"+d.data.percent.toFixed(2)
						+"% of sample "+d.data.sample
						+"<br/>"+(d.value*100/node.value).toFixed(2) 
						+"% of the view";
				})
		}
		else if(state=="hide") {
			d3.select("#mtm-tip").style("opacity",0)
		}
		else { // move
			d3.select("#mtm-tip").style("top", (d3.event.pageY+10)+"px")
            .style("left", (d3.event.pageX+10)+"px")
		}
	}
	
	function configChange(elem) {
		var vals=elem.id.split(/_/);
		if(elem.type=="checkbox") {
			if(elem.checked){ config[vals[0]][vals[1]]=true; }
			else { config[vals[0]][vals[1]]=false; }
		}
		else { config[vals[0]][vals[1]]=elem.value; }
	}
	
	function handleTouch(d) { touched==d ? touched="": touched=d; }
	
	//VIEW UPDATE//
	function updateModal(mode) {
		if(mode == "convert") {
			d3.select("#mtm-modal-title").text("Convert data file")
			d3.select("#mtm-modal-body").text("")
			mtm.convertor("mtm-modal-body");
		}
		else if(mode == "examples") {
			d3.select("#mtm-modal-title").text("Examples data files")
			var ul = d3.select("#mtm-modal-body").text("").append("ul").attr("class","list-unstyled")
			ul.append("li").append("label").text("#1. HuFS: Human gut - 30y old").attr("width","210px")
			var li = ul.append("li").attr("class","btn-group")
			li.append("a").attr("href","http://www.ncbi.nlm.nih.gov/pubmed/17916580")
				.attr("class","btn btn-default")
				.attr("target","cite").text("citation")
			li.append("a").attr("href","http://metagenomics.anl.gov/metagenomics.cgi?page=MetagenomeOverview&metagenome=4525311.3")
				.attr("class","btn btn-default")
				.attr("target","rast").text("data source")
			li.append("a").attr("href","./data/HuFS.json")
				.attr("class","btn btn-default")
				.attr("target","rast").text("data file")

			ul.append("li").append("label").text("#2. HuFU: Human gut - 3m old").attr("width","210px")
			li = ul.append("li").attr("class","btn-group")
			li.append("a").attr("href","http://www.ncbi.nlm.nih.gov/pubmed/17916580")
				.attr("class","btn btn-default")
				.attr("target","cite").text("citation")
			li.append("a").attr("href","http://metagenomics.anl.gov/metagenomics.cgi?page=MetagenomeOverview&metagenome=4525314.3")
				.attr("class","btn btn-default")
				.attr("target","rast").text("data source")
			li.append("a").attr("href","./data/HuFU.json")
				.attr("class","btn btn-default")
				.attr("target","rast").text("data file")
		}
		else if(mode == "about") {
			d3.select("#mtm-modal-title").text("About MetaTreeMap")
			var ul = d3.select("#mtm-modal-body").text("").append("ul").attr("class","list-unstyled")
			var li = ul.append("li")
			li.append("strong").text("MetaTreeMap version ")
			li.append("strong").text(function(){return mtm.version;})
			li.append("strong").text(" under ")
			li.append("a").attr("href","./LICENSE").attr("target","_blank").text("BSD License")
			var li = ul.append("li")
			li.append("strong").text("Development: ")
			li.append("a").attr("href","http://metasystems.riken.jp/wiki/Maxime_Hebrard").attr("target","_blank").text("Maxime HEBRARD")
			var li = ul.append("li")
			li.append("strong").text("Thanks to ")
			li.append("span").text("the libraries we use and their authors:")
			var sub = li.append("ul")
			sub.append("li").append("a").attr("href","https://d3js.org/").attr("target","_blank").text("D3")
			sub.append("li").append("a").attr("href","http://colorbrewer2.org/").attr("target","_blank").text("ColorBrewer2")
			sub.append("li").append("a").attr("href","https://jquery.com/").attr("target","_blank").text("jQuery")
			sub.append("li").append("a").attr("href","http://getbootstrap.com/").attr("target","_blank").text("Bootstrap")
			sub.append("li").append("a").attr("href","http://www.bootstraptoggle.com/").attr("target","_blank").text("Bootstrap Toggle")
			sub.append("li").append("a").attr("href","https://silviomoreto.github.io/bootstrap-select/").attr("target","_blank").text("Bootstrap-select")
			sub.append("li").append("a").attr("href","https://www.google.com/fonts/specimen/Source+Code+Pro").attr("target","_blank").text("Source Code Pro")
			var li = ul.append("li")
			li.append("strong").text("Source code ")
			li.append("span").text("available on ")
			li.append("a").attr("href","https://github.com/mhebrard/MetaTreeMap").attr("target","_blank").text("GitHub")
			var li = ul.append("li")
			li.append("strong").text("Download ")
			li.append("span").text("minified version ")
			li.append("a").attr("href","./mtm.min.js").attr("target","_blank").text("Here")
		}
	}
	function updateRects(n) {
		//scale
		x.domain([n.x, n.x + n.dx]);
		y.domain([n.y, n.y + n.dy]);
		var kx = config.options.zoom ? 1 : (w / n.dx) ; //True=fluid, False=sticky
		var ky = config.options.zoom ? 1 : (h / n.dy) ; //True=fluid, False=sticky

		//select
		var displayed;
		if(config.options.hierarchy) { //ancestor + leaves (w>0 & h>0)
			displayed=d3layout.nodes().filter(function(d) {return d.parent && (kx*d.dx-1 > 0) && (ky*d.dy-1 > 0);})
		}
		else { // leaves
			displayed=d3layout.nodes().filter(function(d){return !d.children && (kx*d.dx-1 > 0) && (ky*d.dy-1 > 0);})
		}

		//rect
		var sel = d3.select("#mtm-treemap").select(".mtm-view")
			.selectAll("rect").data(displayed,function(d){return d.id+d.data.sample;});
		//create new
		sel.enter().insert("rect")
			.attr("class",function(d){ return "v"+d.id+d.data.sample;})
			.style("stroke",function() {return config.options.background ? "#000" : "#FFF"; })
			.style("fill",function(d){return d.data.color;})
			.style("cursor","pointer")
			.attr("transform","translate(0,0)")
			.attr("width", 0)
			.attr("height", 0)
			.on("click", function(d) {
				if(touched=="") {//mouse click or 2nd touch
					highlight(d,false);
					tip("hide",d);
					zoomSkip(d);
				}
			})
			.on('mouseover', function(d){
					highlight(d,true);
					tip("show",d);
				})
			.on('mouseout', function(d){
					highlight(d,false);
					tip("hide",d);
				})
			.on("mousemove", function(d) { tip("move"); })
			.on("touchstart", handleTouch)
		//update all
		sel.transition().duration(1500)
			.attr("transform", function(d) {return "translate("+x(d.x)+","+y(d.y)+")";})
			.attr("width", function(d) { return kx * d.dx - 1; })
			.attr("height", function(d) { return ky * d.dy - 1; })
		//delete
		sel.exit().remove()
	}

	function updatePaths(n) {
		//scale
		var mw=Math.round(config.options.font*0.6); //SourceCodePro
		var mh=Math.round(config.options.font*1.3); //SourceCodePro 
		var kx = config.options.zoom ? 1 : (w / n.dx) ; //True=fluid, False=sticky
		var ky = config.options.zoom ? 1 : (h / n.dy) ; //True=fluid, False=sticky

		//select
		var labelled = [];
		var rank = ranks.indexOf(config.options.labelled_rank) //selected rank
		if(config.options.labelled=="no") {}
		else if(config.options.labelled=="rank" && rank!=-1) { //show selected group || upper leaves
			labelled=labeledByRank(rank,root,root);
		}
		else { //label for each tags
			labelled=d3layout.nodes(root).filter(function(d){return !d.children;})
		}
		//filter
		labelled = labelled.filter(function(d) {
			var rw = kx * d.dx - 1;
			var rh = ky * d.dy - 1;
			if( (rw>0 && rh>0) //rectangle visible
			&& (
				( (rw<rh) && (rw>mh) && (y(d.y+d.dy)-y(d.y)-2*mw>0) ) //Vertical + marge
				|| ( (rw>rh) && (rh>mh) && (x(d.x+d.dx)-x(d.x)-2*mw>0) ) //Horizontal + marge
				)
			) {return d;}
			
		})
		//guides
		var sel = d3.select("#mtm-treemap").select(".mtm-labels")
			.selectAll("path").data(labelled,function(d){return d.id+d.data.sample;});
			//create new
			sel.enter().append("path")
				.attr("id",function(d){return "map"+d.id+d.data.sample;})
				.attr("d","M0,0L0,0")
				.style("opacity",0)
				.style("pointer-events","none")
			//update all
			sel.transition().duration(1500)
				.attr("d",function(d) {return line(d);})
			//delete
			sel.exit().remove()
		
		function line(d) {
			var ax,ay,bx,by;
			//rect width and heigth
			var rw=kx * d.dx - 1;
			var rh=ky * d.dy - 1;

			if(rw<rh) {//vertical
				ax=x(d.x+(d.dx/2));
				ay=y(d.y)+mw;
				bx=ax;
				by=y(d.y+d.dy)-mw;
			}
			else { //horizontal
				ax=x(d.x)+mw;
				ay=y(d.y+(d.dy/2));
				bx=x(d.x+d.dx)-mw;
				by=ay;				
			}
			
			var path = d3.svg.line()
			.x(function(t) {return t[0];})
			.y(function(t) {return t[1];})
			.interpolate("linear");
			return path([[ax,ay],[bx,by]]);
		}

		//text
		var sel = d3.select("#mtm-treemap").select(".mtm-labels")
			.selectAll("text").data(labelled,function(d){return d.id+d.data.sample;});
			//create new
			sel.enter().append("text")
				.attr("text-anchor", "left")
				.attr("dy","0.5ex")
				.style("pointer-events","none")
				.append("textPath")
				.attr("xlink:href",function(d){return "#map"+d.id+d.data.sample;})
			//update all
			sel.selectAll("textPath").html(function(d){
					var tag = config.options.pattern;
					//replace
					tag = tag.replace(/#N/g,d.name);
					tag = tag.replace(/#I/g,d.id);
					tag = tag.replace(/#H/g,d.data.hits);
					tag = tag.replace(/#P/g,d.data.percent.toFixed(2));
					tag = tag.replace(/#V/g,(d.value*100/node.value).toFixed(2));
					tag = tag.replace(/#R/g,d.data.rank);
					tag = tag.replace(/#S/g,d.data.sample);
					return tag;
				})
			//delete
			sel.exit().remove();
	}

	function updateSearch() {
		var sel = d3.select(".selectpicker").selectAll("option")
			.data(searchable,function(d) {return d.id;})
		sel.enter().append("option")
			.attr("value",function(d,i){return i;})
			.text(function(d){return d.name;})
		sel.exit().remove()
		$('.selectpicker').selectpicker('refresh');
	}

	function updateLines() {
		//Fill table
		if(verbose){console.time("growTable");}

		//delete old lines
		var view = d3.select("#mtm-table").select(".mtm-view").html("");
		//create tr and td
		view.selectAll("tr").data(searchable).enter().append("tr")
				.attr("class",function(d){return "v"+d.id+d.data.sample;})
				.on("mouseover",function(d) { 
					highlight(d,true);
					tip("show",d);
				})
				.on("mouseout",function(d) {
					highlight(d,false);
					tip("hide",d);
				})
				.on("mousemove", function(d) { tip("move"); })
				.selectAll("td").data(["name","id","hits","percent","sample","rank"])
					.enter().append("td").attr("class",function(d){return d;})

		//fill name
		view.selectAll(".name").data(searchable)
			.style("white-space","nowrap")
			.style("overflow","hidden")
			.style("text-overflow","ellipsis")
			.style("cursor","pointer")
			.append("span")
				.style("padding-left",function(d){//max(depth,rank)
					return (+Math.max(d.depth,(d.children ? ranks.indexOf(d.data.rank) : ranks.indexOf(d.data.rank)+1))*4)+"px";
				})
				.html(function(d){return "<span class='fa'>&nbsp;</span>";})
				.append("span")
					.on("click", function(d){  
						highlight(d,false);
						return zoom(d);
					})
					.text(function(d){return d.name;})
		//fill id
		view.selectAll(".id").data(searchable)
				.style("width","70px").style("text-align","right")
				.append("span")
				.filter(function(d){return +d.id>0})
					.append("a")
					.attr("href",function(d){ return "http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id="+d.id;})
					.attr("target", "taxonomy")
					.text(function(d){return d.id})
		//fill hits
		view.selectAll(".hits").data(searchable)
				.style("width","60px").style("text-align","right")
				.append("span").text(function(d){return d.data.hits;})
		//fill %
		view.selectAll(".percent").data(searchable)
				.style("width","60px").style("text-align","right")
				.append("span")
				//.text() fill in zoom()
		//fill sample
		view.selectAll(".sample").data(searchable)
				.style("width","80px").style("text-align","right")
				.append("span").html(function(d){
					return d.data.percent.toFixed(2)+"%/"+d.data.sample+"&nbsp;";
				})
		//fill rank
		view.selectAll(".rank").data(searchable)
				.style("width","130px")
			.append("span").text(function(d){return d.data.rank;})

		//internal nodes
		view.selectAll("tr")
			.filter(function(d){return d.children;})
			.select(".fa")
			.on("click",function(d){ return toggle(d); })
	}

	function updateColor() {
		if(verbose){console.time("updateColor");}
		rank = ranks.indexOf(config.options.colored_rank) //selected rank
		var getColor;
		//color by rank : top-down
		if(config.options.colored=="rank" && rank!=-1) {
			if(config.options.depth_rank=="init") {colorByRank(rank,root,root);}
			else {colorByRank(rank,tree,tree);}
			getColor = function(d){return d.data.color;}
		}
		//set color
		else if(config.options.colored=="majority") { //colorByMajority
			getColor = function(d) {
				if(!d.children) {d.data.color = color(d.parent.data.count.indexOf(Math.max(...d.parent.data.count)));}
				else {d.data.color = color(d.data.count.indexOf(Math.max(...d.data.count)));}
				return d.data.color;
			}
		}
		else if(config.options.colored=="sample") {
			getColor = function(d) {
				d.data.color = color(d.data.sample);
				return d.data.color;
			}
		}
		else {//default (config.options.colored=="taxon")
			getColor = function(d) {
				d.data.color = color(d.id);
				return d.data.color;
			}
		}
		//Affect color
		if(config.table.display) { //call table + affect treemap
			d3.select("#mtm-table").select(".mtm-view").selectAll("tr")
				.style("background-color",function(d){ return getColor(d); })
		}
		if (config.treemap.display) { //call treemap
			d3.select("#mtm-treemap").select(".mtm-view").selectAll("rect")
				.style("fill",function(d){return getColor(d);})
		}
	}

	function colorByRank(r,p,n){
		//r is the rank we need
		//p is root
		//n is the current node. Test on n.children
		//console.log(n);
		if(n.children && n.children.length>0) {
			for (var i in n.children) {
				var rankC=ranks.indexOf(n.children[i].data.rank);

				if(rankC>r) { //missing rank
					getSubtree(n.children[i],[]).forEach(function(d) {
						d.data.color = color("sub"+n.id);
					})
				}
				else if(rankC==r) { //color node + subtree
					getSubtree(n.children[i],[]).forEach(function(d) {
						d.data.color = color(n.children[i].id);
					})
				}
				else  { //if(rankC==0 || rankC<r) //search deeper
					if(config.options.ancestors) { //enable
						n.children[i].data.color = color(n.children[i].id); //taxon
					}
					else {n.children[i].data.color = "#888";} //gray
					colorByRank(r,p,n.children[i]);
				}
			}//end foreach
		}//end children
	}

	function labeledByRank(r,p,n){
		//r is the rank we need
		//p is root
		//n is the current node. Test on n.children
		var l=[];
		if(n.children && n.children.length>0) {
			for (var i in n.children) {
				var rankC=ranks.indexOf(n.children[i].data.rank);

				if(rankC>=r) { //missing rank
					l.push(n.children[i]);
	
				}
				else  { //if(rankC==0 || rankC<r) //search deeper
					l=l.concat(labeledByRank(r,p,n.children[i]));
				}
			}//end foreach
		}//end children
		else {
			if(ranks.indexOf(n.data.rank)<r) { l.push(n); } 
		}
		return l;
	}

	function collapseByRank(r,p,n){
		//r is the rank we need
		//p is root
		//n is the current node. Test on n.children
		var list=[[],[],[]];//collapse,expand,hide
		if(n.children && n.children.length>0) {
			for (var i in n.children) {
				var rankC=ranks.indexOf(n.children[i].data.rank);
				if(rankC>=r) { //match or missing rank 
					//hide lower
					list[2]=list[2].concat(getSubtree(n.children[i],[]));
					//collapse current
					list[0].push(n.children[i]);
				}
				else  { //if(rankC==0 || rankC<r) //search deeper
					//expand upper
					list[1].push(n.children[i]);
					//search deeper
					subList=collapseByRank(r,p,n.children[i]);
					list[0]=list[0].concat(subList[0]);
					list[1]=list[1].concat(subList[1]);
					list[2]=list[2].concat(subList[2]);
				}
			}//end foreach
		}//end children
		return list;
	}
	
	function highlight(n,toggle) {
		if(toggle) {
			var kx = w / node.dx, ky = h / node.dy;
			//d3.selectAll(".v"+n.id+n.data.sample).style("opacity",".7")
			d3.selectAll("rect.v"+n.id+n.data.sample).style("fill",function(d){
				return d3.hsl(d.data.color).darker(1);
			})
			d3.selectAll("tr.v"+n.id+n.data.sample).style("background-color",function(d){
				return d3.hsl(d.data.color).darker(1);
			})

			if(d3layout.nodes().indexOf(n)>0) {//hl treemap
				if(n.data.sample==0) {
					d3.selectAll(".mtm-hl")
					.attr("x",x(n.x)+1+2) 
					.attr("y",y(n.y)+20+2) //+header
					.attr("width",(kx*n.dx)-5)
					.attr("height",(ky*n.dy)-5)
				}
				else {
					d3.selectAll(".mtm-hl")
					.attr("x",x(n.parent.x)+1+2) 
					.attr("y",y(n.parent.y)+20+2) //+header
					.attr("width",(kx*n.parent.dx)-5)
					.attr("height",(ky*n.parent.dy)-5)
				}
			}
		}
		else { //mouseout
			//d3.selectAll(".v"+n.id+n.data.sample).style("opacity","1")
			d3.selectAll("rect.v"+n.id+n.data.sample).style("fill",function(d){
				return d3.hsl(d.data.color);
			})
			d3.selectAll("tr.v"+n.id+n.data.sample).style("background-color",function(d){
				return d3.hsl(d.data.color);
			})
			d3.selectAll(".mtm-hl")
				.attr("x",0) 
				.attr("y",0)
				.attr("width",0)
				.attr("height",0)
		}
	}

	function zoomSkip(d) {
		//skip node if same hits (bridge)
		if(d==node){ //zoom out
			if(d.parent){ //no root
				if(d.parent.data.hits==d.data.hits) { //same hits
					node=d.parent;
					zoomSkip(d.parent);
				}
				else { zoom(d.parent); } //more hits
			}
			else {} //root 
		}
		else { //zoom in
			if(d.children) { //no leaf
				if (d.children[0].data.hits==d.data.hits) { //same hits
					zoomSkip(d.children[0]);
				}
				else { zoom(d); } //less hits
			}
			else { zoom(d.parent); } //leaf
		}
	}
	
	function zoom(n) {
		//update current node
		node = n;
		//console.log("zoom",n.name, n)
		//button root switch
		if (!n.parent) { //root
			d3.selectAll(".mtm-root").classed("mtm-on",true)
			d3.selectAll(".mtm-root").classed("mtm-off",false)
		}
		else { 
			d3.selectAll(".mtm-root").classed("mtm-on",false)
			d3.selectAll(".mtm-root").classed("mtm-off",true)
		}
		//update header
		d3.select("#mtm-treemap").select(".mtm-header")
			.datum(n)
			.on("click", function(d) {
					if(touched=="") {//mouse click or 2nd touch
						highlight(d,false);
						tip("hide",d);
						zoomSkip(d);
					}
				})
			.on('mouseover', function(d){
				highlight(d,false);
				tip("show",d);
			})
			.on('mouseout', function(d){
				highlight(d,false);
				tip("hide",d);
			})
			.on("mousemove", function(d) { tip("move"); })
			.on("touchstart", handleTouch)
			.select("text")
				.text(function(d) { return d.name; })

		if(config.options.zoom) { //fluid
			computeLayout(n);
			updateColor();
		}

		//update map
		if(config.treemap.display) {
			updateRects(n); //Create rectangle elements and position
			updatePaths(n); //Create path and text element and position
		}

		//update table
		if(config.table.display) {
			var lines = d3.select("#mtm-table").select(".mtm-labels").selectAll("tr")
			//clear %
			lines.selectAll(".percent").text("-")
			
			//set % of the subtree
			lines.data(getSubtree(n,[]),
					function(d){return "t"+d.id+d.data.sample;}) //lines of subtree
				.selectAll(".percent") //column of %
				.text( //new text
					function(d){return (d.value*100/n.value).toFixed(2)+"%";}
				)
			//manage collapse
			if(config.options.labelled=="rank" && rank!=-1){
				var list = collapseByRank(rank,root,root);
				//hide lower
				lines.data(list[2],function(d){return "v"+d.id+d.data.sample;})
					.style("display","none")
				//collapse rank
				lines.data(list[0],function(d){return "v"+d.id+d.data.sample;})
					.style("display","table-row")
					.select(".fa").attr("class","fa fa-plus-square-o")
				//expand upper
				lines.data(list[1],function(d){return "v"+d.id+d.data.sample;})
					.style("display","table-row")
					.select(".fa").attr("class","fa fa-minus-square-o")
			}
			else { //expand all
				lines.style("display","table-row")
					.select(".fa").attr("class","fa fa-minus-square-o")		
			}
			//leaf
			lines.filter(function(d){return !d.children;})
				.select(".fa").attr("class","fa fa-square-o")
			if(verbose){console.timeEnd("setLabelTable");}
		}
	}

	function getSubtree(n,ns) {
		//exclude root because id not exist
		if(n!=root) { ns.push(n); }
		//get a list of all nodes in subtree of n, n included
		if(n.children) {
			n.children.forEach(function(c){
				ns = getSubtree(c,ns); 
			}); 
		}
		return ns;
	}
	
	function toggle(d) {
		var span = d3.select("#mtm-table").select(".v"+d.id+d.data.sample).select(".fa")
		if(span.classed("fa-minus-square-o")) {
			span.attr("class","fa fa-plus-square-o");
			//hide children 
			if (d.children) {
				for (var i in d.children) {
					hide(d.children[i]);
				}
			}
		}
		else {
			span.attr("class","fa fa-minus-square-o");
			//show children
			if (d.children) {
				for (var i in d.children) {
					show(d.children[i]);
				}
			}
		}
	}
	
	function hide(n) {
		//hide current raw and recursive
		d3.select("#mtm-table").selectAll(".v"+n.id+n.data.sample)
			.style("display","none")
		//recursive call
		if (n.children) {
			for (var i in n.children) {
				hide(n.children[i]);
			}
		}		
	}
		
	function show(n) {
		//show current raw and recursive
		var t = d3.select("#mtm-table").select(".v"+n.id+n.data.sample)
					.style("display","table-row")
		if(t.select(".fa").classed("fa-minus-square-o") && n.children) {
			for (var i in n.children) {
				show(n.children[i]);
			}
		}
	}
	
	//OUTPUT//
	function copy(n,p) {
		//clean the structure tree to fit with input format
		if (n.children && n.children.length>0) { //internal node
			var cur; // copy of n node in out tree.
			if(!p) { //root
				cur = {"name":n.name,"children":[],"data":{"assigned":0,"sum":n.data.hits,"rank":n.data.rank},"id":n.id};
				out = cur ;
			}
			else {
				if(n.data.hits == p.data.sum) { //bridge > merge up
					p.name = n.name;
					p.data.rank = n.data.rank;
					p.id= n.id;
					cur=p;
				}
				else { //create node
					cur = {"name":n.name,"children":[],"data":{"assigned":0,"sum":n.data.hits,"rank":n.data.rank},"id":n.id};
					p.children.push(cur);
				}
			}
			//recursive call
			for (var i in n.children) { copy(n.children[i],cur); }
		}
		else { //leaf
			p.data.assigned = p.data.assigned + n.data.hits;
		}
	}
	
	function ddl(name,url) {
		//hidden link to call DDL
		d3.select("#mtm-canvas").append("a")
			.attr("download",name)
			.attr("href",url)
			.node()
			.click()
	}
	
	function exportTab(n) {
		var str = n.name+"\t"
			+(+n.id >0 ? n.id : "")+"\t"
			+n.data.hits+"\t"
			+((n.data.hits * 100 / root.data.hits).toFixed(1))+"\t"
			+n.data.sample+"\t"
			+n.data.rank+"\n";
		//recursive call
		if (n.children && n.children.length>0) {
			for (var i in n.children) {
				str = str + exportTab(n.children[i]);
			}
		}
		return str;
	}
	
	function format(e) {
		//manage radio button switch in mtm.convertor
		if(e.value=="json"){
			d3.select("#mtm-fieldhead").text("Object property")
			d3.select("[name=mtm-tid]").attr("value","id")
			d3.select("[name=mtm-tname]").attr("value","name")
			d3.select("[name=mtm-hits]").attr("value","data.assigned")
			d3.select("#mtm-headrow").style("display","none")
		}
		else if(e.value=="tab"){
			d3.select("#mtm-fieldhead").text("Column index")
			d3.select("[name=mtm-tid]").attr("value","1")
			d3.select("[name=mtm-tname]").attr("value","2")
			d3.select("[name=mtm-hits]").attr("value","3")
			d3.select("#mtm-headrow").style("display","table-row")
		}
	}
	
	function convert() {
		var format = d3.select("[name=mtm-format]:checked").node().value
		var file=d3.select("#mtm-convert").node().files[0]
		console.log(file);
		
		//root init.
		root={"name":"root","children":[],"data":{"assigned":0,"rank":"no rank"},"id":1}; //skeleton tree
		bkeys = [root.id]; //list of keys of nodes
		bobjs = [root]; //list of node -object-
			
		//read taxonomy
		var taxonomy=[];
		d3.text("./data/taxonomy.tsv", function(taxo) {
			taxo.split("\n").forEach(function(l){ //for each line
				var vals = l.split("\t");
				taxonomy[+vals[0]]={"id":+vals[0], "parent":+vals[1], "rank":vals[2], "name":vals[3]};
			})
		
			if(format=="json") {
				//get property
				var id=d3.select("[name=mtm-tid]").node().value.split(".")
				var name=d3.select("[name=mtm-tname]").node().value.split(".")
				var hits=d3.select("[name=mtm-hits]").node().value.split(".")
	
				//read input
				d3.json(URL.createObjectURL(file), function(data) {
					propertyMap(taxonomy,data,id,name,hits);
					//compute sum hits
					sumAllHits(data);
					//delete unused property
					propertyFilter(data);
					//create file
					var url = 'data:text/json;charset=utf8;filename=output.json,' + encodeURIComponent(JSON.stringify(out));
					//Direct DownLoad call
					ddl(file.name.replace(/.[^.]*$/,"")+"_metabin.json",url);
				});
				
			}
			else if(format=="tab") {
				//get property
				var id=+d3.select("[name=mtm-tid]").node().value-1
				var name=+d3.select("[name=mtm-tname]").node().value-1
				var hits=+d3.select("[name=mtm-hits]").node().value-1
				var header=d3.select("[name=mtm-head]").property("checked")
	
				//read input
				d3.text(URL.createObjectURL(file), function(data) {
					var lines = data.split(/\r?\n/);
					var i;
					header ? i=1 :i=0; //ignore first line
					for(i;i<lines.length;i++) {//for each line
						if (lines[i]!="") { //ignore empty lines
							var vals = lines[i].split("\t");
							if(vals[id]==0) { //artificial node
								taxonomy[0]= {"id":vals[name], 
									"parent":1, 
									"rank":"no rank", 
									"name":vals[name]};
							}
							ancestor(taxonomy,vals[id],vals[hits]);
						}
					}
					
					//compute sum hits
					sumAllHits(root);
					//create file
					var url = 'data:text/json;charset=utf8;filename=output.json,' + encodeURIComponent(JSON.stringify(root));
					//Direct DownLoad call
					ddl(file.name.replace(/.[^.]*$/,"")+"_metabin.json",url);
				
				})
			}
		})
	}
	
	function ancestor(taxonomy,id,hits) {
		//search taxon in NCBI taxonomy, create node and parent
		var taxon = taxonomy[id],
		child,parent,
		newChild;//boolean
		
		//test if child exist
		var idx = bkeys.indexOf(taxon.id);
		if(idx > -1) { //if exist
			newChild=false;
			child=bobjs[idx];
			child.data.assigned=hits;
		}
		else { //else create
			newChild=true;
			child = {"name": taxon.name,
				"children": [],
				"data": {"assigned":hits, "rank":taxon.rank},
				"id": taxon.id}
			bkeys.push(child.id);
			bobjs.push(child);
		}
		
		//test if parent exist
		if(taxon.parent !=taxon.id) {
			var idx = bkeys.indexOf(taxon.parent);
			if(idx > -1) { //if exist
				parent=bobjs[idx];	
			}
			else { //else recursive call
				parent = ancestor(taxonomy,taxon.parent,0); 
			}
			//link
			if(newChild) {
				parent.children.push(child);
			}
		}
		return child;
	}

	function propertyMap(taxonomy,n,id,name,hits) {
		if(!n.data) {n.data={};}
		n.data.assigned=getProperty(n,hits);
		n.id=getProperty(n,id);
		if(+n.id==0 || !taxonomy[+n.id]) {
			n.name=getProperty(n,name);
			n.data.rank="no rank";
		}
		else {
			n.name=taxonomy[+n.id].name;
			n.data.rank=taxonomy[+n.id].rank;
		}
		//recursive call
		if(n.children.length>0) {
			for (var i in n.children) {
				propertyMap(taxonomy,n.children[i],id,name,hits);
			}
		}
	} 
	
	function propertyFilter(n,p) {
		//clean the input object to fit with metabin
		var cur = {"name":n.name,"children":[],"data":{"assigned":n.data.assigned,"sum":n.data.sum,"rank":n.data.rank},"id":n.id};
		if(!p) { //root
			out = cur ;
		}
		else { p.children.push(cur); }
		//recursive call
		for (var i in n.children) { propertyFilter(n.children[i],cur); }
	}
	
	function getProperty(n,path){
		var i=0,val=n;
		while(path[i]) {
			val=val[path[i]];
			i++;
		}
		return val;
	}
	
	function sumAllHits(n) {
		n.data.sum=+n.data.assigned;
		//recursive call
		if (n.children.length>0) {
			for (var i in n.children) {
				var sum = sumAllHits(n.children[i]);
				n.data.sum+=sum;
			}
		}
		return +n.data.sum;
	}
	
	//DEFINE OR EXPORTS//
	if (typeof define === "function" && define.amd) define(mtm); else if (typeof module === "object" && module.exports) module.exports = mtm;
	this.mtm = mtm;
	
}());
