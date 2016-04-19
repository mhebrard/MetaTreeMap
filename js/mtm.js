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
	var sorted; //taxa names for search
	var d3layout; //d3 layout
	var color=""; //color set for leaves
	var colors=[ //default set of colors
		["colorbrewer.Set3(12)","#8dd3c7,#ffffb3,#bebada,#fb8072,#80b1d3,#fdb462,#b3de69,#fccde5,#d9d9d9,#bc80bd,#ccebc5,#ffed6f"], 
		["d3.category20(20)","#1f77b4,#aec7e8,#ff7f0e,#ffbb78,#2ca02c,#98df8a,#d62728,#ff9896,#9467bd,#c5b0d5,#8c564b,#c49c94,#e377c2,#f7b6d2,#7f7f7f,#c7c7c7,#bcbd22,#dbdb8d,#17becf,#9edae5" ]
	];
	
	//need to update
	var w=1,h=1; //map dimentions
	var x,y; //d3 scales
	var kx=1,ky=1; //zoom ratio
	var touched=""; //node for touch event
	
	//CONSTRUCTORS//
	mtm.load = function(files,conf) {
		//manage dependencies
		var queue = [];
		queue.push(linkload("http://fonts.googleapis.com/css?family=Source+Code+Pro:600"));
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
		.then(function() { return Promise.all([loadConf(conf),loadData(files)]); })
		.catch(function(err) { return Error("mtm.load.data:",err); })
		.then(function(load) { 
			//hundreds + sumHits
			load[1][0] = load[1].reduce(function(a,b) {return +a + +b;});
			sumHits(root,load[1]);
			console.log("root",root);
			setLayout();
		})
	}

	function scriptload(u) {
		return new Promise(function(ful) {
			var s = document.createElement('script');
			s.type = 'text/javascript';
			s.src = u;
			s.onload = function(){ return ful(u+" loaded");}
			document.getElementsByTagName('head')[0].appendChild(s);
		});
	}

	function linkload(u) {
		return new Promise(function(ful) {
			var s = document.createElement('link');
			s.rel = 'stylesheet';
			s.href = u;
			s.crossorigin = "anonymous";
			s.onload = function(){ return ful(u+" loaded");};
			document.getElementsByTagName('head')[0].appendChild(s);
		});
	} 

	function loadConf(conf) {
		return new Promise(function(ful) {
			if(conf) { 
				d3.json(URL.createObjectURL(conf),function(c) {
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
		//root init.
		root={"name":"root","children":[],"data":{"hits":0,"rank":"no rank","sample":0,"color":"#888"},"id":"1"}; //skeleton tree
		bkeys = [root.id]; //list of keys of nodes
		bobjs = [root]; //list of node -object-
		var hundreds = []; //samples total reads
		//sequential merge
		var seq=Promise.resolve(hundreds);
		files.forEach(function(f,i) {
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
			ddl("merge.json",url);
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
			.append("table")
		var row = container.append("tr");
		row.append("td")
			.text("Other.json")
			.append("input")
			.attr("type","radio")
			.attr("name","mtm-format")
			.attr("value","json")
			.property('checked', true)
			.on("click",function(){format(this);})
		row.append("td")
			.text("[OR] Tabular.txt")
			.append("input")
			.attr("type","radio")
			.attr("name","mtm-format")
			.attr("value","tab")
			.on("click",function(){format(this);})
		row = container.append("tr");
		row.append("td")
			.text("data file:")
		row.append("td")
			.append("input")
			.attr("type","file")
			.attr("name","mtm-convertFile")
			.attr("id","mtm-convert")
			.style("width","155px")
		row = container.append("tr");
		row.append("th")
			.text("Fields")
		row.append("th")
			.attr("id","mtm-fieldhead")
			.text("Object property")
		row = container.append("tr");
		row.append("td")
			.text("Taxon id:")
		row.append("td")
			.append("input")
			.attr("type","text")
			.attr("name","mtm-tid")
			.attr("value","id")
		row = container.append("tr");
		row.append("td")
			.text("Taxon name:")
		row.append("td")
			.append("input")
			.attr("type","text")
			.attr("name","mtm-tname")
			.attr("value","name")
		row = container.append("tr");
		row.append("td")
			.text("Hits:")
		row.append("td")
			.append("input")
			.attr("type","text")
			.attr("name","mtm-hits")
			.attr("value","data.assigned")
		row = container.append("tr")
			.attr("id","mtm-headrow")
			.style("display","none");
		row.append("td")
			.attr("colspan","2")
			.text("Ignore 1st line (header)")
			.append("input")
			.attr("type","checkbox")
			.attr("name","mtm-head")
			.attr("value","false")
		row = container.append("tr")
		row.append("td")
			.attr("colspan","2")
			.append("input")
			.attr("type","button")
			.attr("name","convert")
			.attr("value","Convert")
			.on("click",function(){convert();})
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
				//n.data.hits=+n.data.hits+count[0];
				//n.data.percent=+n.data.hits*100/h[n.data.sample];
				for(var j in count) {
					n.data.count[j]+=count[j];
				}
				/*var hits=sumHits(n.children[i],h);
				n.data.hits=+n.data.hits+hits;
				n.data.percent=+n.data.hits*100/h[n.data.sample];
				*/
			}
		}
		n.data.count[n.data.sample]+=n.data.hits;
		n.data.hits = n.data.count.reduce(function(t,c){return t+c;},0);
		n.data.percent=+n.data.hits*100/h[n.data.sample];
		//return n.data.hits;
		return n.data.count;
	}

	//VIEW CREATION//
	function setLayout() {
		if(verbose){console.time("layout");}
		
		//style
		d3.select("head").append("style").text(
		"#mtm-tip{position:absolute;z-index:3;background-color:#888;border:1px solid #000;border-radius:.2em;padding:3px;font-family:'Source Code Pro','Lucida Console',Monaco,monospace;font-size:14pt;pointer-events:none;opacity:0}\n"
		+".mtm-button{background-color:#fff;border-radius:.2em;margin:1px;padding:2px ;font-size:14pt;cursor:pointer;display:inline-table;}\n"
		+".mtm-button{background-color:#fff;border-radius:.2em;margin:1px;padding:2px ;font-size:14pt;cursor:pointer;display:inline-table;}\n"
		+".mtm-on{color:#000;border:3px solid #000;}\n"
		+".mtm-off{color:#888;border:3px solid #888;}\n"
		+".mtm-box{position:absolute;z-index:3;background-color:#888;border:1px solid #fff;border-radius:.2em;}\n"
		+".mtm-box:hover{border: 1px solid black;}\n"
		+".mtm-box ul{margin:0px;padding:0px 5px;}\n"
		+".mtm-box ul li {list-style-type:none;list-style-position:outside;}\n"
		+".mtm-box ul li:hover{background-color:#666;cursor:pointer;}\n"
		+"#mtm-table table{border-collapse:collapse;width:100%;}\n"
		)
		
		//Delete previous views
		d3.selectAll(".mtm-container").html("")
		param={};
		tree=false;
		fluid=false;

		
		//hidden div
		d3.select("body").append("div").attr("id","mtm-tip")
		d3.select("body").append("div").attr("id","mtm-canvas").style("display","none")

		//compute tree: root or cutOff
		if(!tree && config.options.depth!="null") {
			var rank = ranks.indexOf(config.options.depth);
			//check depth > n.rank
			if(rank <= ranks.indexOf(config.options.rank)) { 
				rank++; 
				config.options.depth = ranks[rank];
			}
			tree = cutTree(rank,root,root);
			computeLayout(tree);
			sorted = d3layout.nodes().slice(0); //clone
		}
		else { 
			computeLayout(root); 
			sorted = d3layout.nodes().slice(0); //clone
		}

		//build views
		if(config.bar) { bar(config.bar); }
		if(config.configuration && config.configuration.display) {
			configuration(config.configuration);
		}
		if(config.table && config.table.display) {
			param.table={};
			table(config.table,param.table);
			updateLines();
		}
		if(config.treemap && config.treemap.display) {
			param.treemap={};
			treemap(config.treemap,param.treemap);
			if(!fluid && config.options.zoom=="fluid") {
				fluid = config.options.depth!="null" ? tree : root ;
			}
		}

		console.log("hierarchies","r:",root,"t:",tree,"f:",fluid);

		//sort nodes for search
		sorted.sort(function(a,b) { return a.name.length<b.name.length ? -1 : a.name.length>b.name.length ? 1 : a.name<b.name ? -1 : a.name>b.name ? 1 : 0  ; });
		var domain = sorted.reduce(function(p,c) {if(p.indexOf(c.id)<0){p.push(c.id);}return p;}, []);
		color=d3.scale.ordinal().range(config.options.palette.split(/\s*,\s*/)).domain(domain);
		
		//update
		//create rect + %view
		tree ? zoom(tree) : zoom(root);
		updateColor();
		
		if(verbose){console.timeEnd("layout");}
	}
	
	function computeLayout(n) {
		console.log("compute layout",n.name);
		if(config.treemap.display) {
			h = config.treemap.height - 20;  //margin top
			w = config.treemap.width - 1; //margin left
		}
		//compute final json tree
		d3layout = d3.layout.treemap() //array of all nodes
			.size([w, h]) //size of map
			.round(false) //round the value (for scale)
			.sticky(true) //keep child position when transform
			.padding(function(){return config.treemap.border ? 2 : 0;})
			.value(setMode(config.options.mode))

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
		if(confMode=="norm") { mode=sizeNorm; }
		else if(confMode=="hits") { mode=sizeHits; }
		else if(confMode=="nodes") { mode=sizeNodes;}
		else {console.log("ERROR: unvalide size mode"); mode=sizeNorm; }
		return mode;
	}
	
	function sizeNorm(d) { return d.data.percent; }
	function sizeHits(d) { return d.data.hits; } 
	function sizeNodes(d) { return 1; }

	//LAYOUTS//
	function bar(c,location,width) {
		if(verbose){console.time("bar");}
		//create menu bar//
		var menu;
		if(location) {
			menu = d3.select("#"+location)
				.classed("mtm-container",true)
				.append("div")
				.classed("mtm-menu",true)
				.style("width",width+"px")
		}
		else if(c.display) {
			menu = d3.select("#"+c.location)
				.classed("mtm-container",true)
				.append("div")
				.classed("mtm-menu",true)
				.style("width",c.width+"px")
		}
		else { 
			menu = d3.select("body")
				.append("div")
				.classed("mtm-menu",true)
				.style("display","none")
		}
		
		menu.style("position","relative")
			.style("z-index","2") //menu is in the middle
		
		//Color By//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("span").attr("class","fa fa-link")
			.attr("title","Color by...")
			.append("select").attr("class","mtm-color")
			//options//
			s.append("option").attr("value","taxon").text("by taxon")
			s.append("option").attr("value","rank").text("by rank")
			s.append("option").attr("value","sample").text("by sample")
			s.append("option").attr("value","max").text("majority")
			//value//
			s.property("value",config.options.color)
			s.on("change",function() { 
				//change all button
				config.options.color=this.value;
				d3.selectAll(".mtm-color").property('value',this.value)
				d3.select("#options_color").property('value',this.value)
				//action
				updateColor();
			});
		
		//Phylogenic Rank//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("select").attr("class","mtm-phylogeny")
			//options//
			s.append("option").attr("value","init").text("--Phylogenic rank--")
			for (var k in ranks) {
				s.append("option").attr("value",ranks[k]).text(ranks[k])
			}
			//value//
			s.property("value",config.options.rank)
			s.on("change",function() {
				//change all button
				config.options.rank=this.value;
				d3.selectAll(".mtm-phylogeny").property('value',this.value)
				d3.select("#options_rank").property('value',this.value)
				//action
				if(config.options.color=="rank") { updateColor(); }
				if(config.options.label=="rank") {
					updateLabel();
					zoom(node);
				}
			});
		
		//Labels//
		menu.append("span").attr("class","mtm-button fa fa-tag mtm-label")
			.attr("title","Labelling leaves or ranks")
			.classed("mtm-on",function() { return config.options.label=="taxon"; })
			.classed("mtm-off",function() { return config.options.label=="rank"; })
			.on("click", function() {
				config.options.label=config.options.label=="taxon"?"rank":"taxon";
				d3.selectAll(".mtm-label")
					.classed("mtm-on",function() { return config.options.label=="taxon"; })
					.classed("mtm-off",function() { return config.options.label=="rank"; })
				d3.select("#options_label").property('value',config.options.label);
				zoom(node);
			});
		
		//Parents//	
		menu.append("span").attr("class","mtm-button fa fa-sitemap mtm-upper")
			.attr("title","Grayed or colored upper ranks")
			.classed("mtm-on",function() { return config.options.upper=="color"; })
			.classed("mtm-off",function() { return config.options.upper=="gray"; })
			.on("click", function() {
				config.options.upper=config.options.upper=="color"?"gray":"color";
				d3.selectAll(".mtm-upper")
					.classed("mtm-on",function() { return config.options.upper=="color"; })
					.classed("mtm-off",function() { return config.options.upper=="gray"; })
				d3.select("#options_upper").property('value',config.options.upper)
				updateColor();
			});
			
		//Home//
		menu.append("span").attr("class","mtm-button fa fa-home mtm-root")
			.attr("title","Back to root")
			.classed("mtm-on",true)
			.on("click", function() { 
				d3.selectAll(".mtm-root").classed("mtm-on",true);
				if(config.options.depth=="null") { zoom(root);}
				else { zoom(tree); }
			})
		
		//Font//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("span").attr("class","fa fa-text-height")
			.attr("title","Font size")
			.append("select").attr("class","mtm-font")
			//options//
			for (var i=8; i<40; i=i+2) {
				s.append("option").attr("value",i).text(i);
			}
			//value//
			s.property("value",config.options.font)
			s.on("change",function() { 
				//change all button
				config.options.font=this.value;
				d3.selectAll(".mtm-font").property('value',this.value)
				d3.select("#options_font").property('value',this.value)
				//action
				updateLabel();
				zoom(node);
			})

		//Palette//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.style("position","relative").style("z-index","1")
			.append("span").attr("class","fa fa-eyedropper")
			.attr("title","Color palette")
		s.append("input").attr("type","text")
			.attr("class","mtm-palette")
			.attr("size","7")
			.attr("value",config.options.palette)
			.on("click",function() {
				d3.selectAll('.mtm-colorbox').select('ul')
					.style("padding","5px")
					.selectAll("li")
					.data(colors)
					.enter().append("li")
					.on("click",function(d) {
						//change all button
						config.options.palette=d[1];
						d3.selectAll(".mtm-palette").property("value",d[1])
						d3.select("#options_palette").property('value',d[1])
						//action
						d3.selectAll('.mtm-colorbox').select('ul').style("padding","0px 5px")
							.selectAll("li").remove()
						color=d3.scale.ordinal().range(config.options.palette.split(/\s*,\s*/))
						updateColor(); 
					})
					.text(function(d){ return d[0]; }) 
			})
			.on("change", function() {
				//change all button
				config.options.palette=this.value;
				d3.selectAll(".mtm-palette").property("value",this.value)
				d3.select("#options_palette").property('value',this.value)
				//action
				d3.selectAll('.mtm-colorbox').select('ul').style("padding","0px 5px")
					.selectAll("li").remove()
				color=d3.scale.ordinal().range(config.options.palette.split(/\s*,\s*/))
				updateColor(); 
			})
		s.append("div").attr("class","mtm-colorbox mtm-box")
			.append("ul")
			
		//Background//
		menu.append("span").attr("class","mtm-button fa fa-adjust mtm-background")
			.attr("title","Background black or white")
			.classed("mtm-on",function() { return config.options.background=="black"; })
			.classed("mtm-off",function() { return config.options.background=="white"; })
			.on("click", function() {
				config.options.background=config.options.background=="black"?"white":"black";
				d3.selectAll(".mtm-background")
					.classed("mtm-on",function() { return config.options.background=="black"; })
					.classed("mtm-off",function() { return config.options.background=="white"; })
				d3.select("#options_background").property('value',config.options.background)
				//action
				d3.selectAll(".mtm-bg").attr("fill",config.options.background)
				d3.selectAll(".mtm-header rect").style("stroke",config.options.background)
				d3.selectAll(".mtm-view rect").style("stroke",config.options.background)
				d3.select("#mtm-table").style("background-color",config.options.background)
			});
			
		//Mode//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("span").attr("class","fa fa-th")
			.attr("title","Size mode")
			.append("select").attr("class","mtm-mode")
			//options//
			s.append("option").attr("value","norm").text("norm")
			s.append("option").attr("value","hits").text("hits")
			s.append("option").attr("value","nodes").text("nodes")
			//value//
			s.property("value",config.options.mode)
			s.on("change",function() { 
				//change all button
				config.options.mode=this.value;
				d3.selectAll(".mtm-mode").property('value',this.value)
				d3.select("#options_mode").property('value',this.value)
				//action
				d3layout.value(setMode(config.options.mode))
				d3layout.nodes(root)
				zoom(node);
			});
		
		//Search bar//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.style("position","relative").style("z-index","1")
			.append("span").attr("class","fa fa-search")
			.attr("title","Search a taxon")
		s.append("input").attr("type","text")
			.attr("class","mtm-search")
			.attr("size","7")
			.on("keyup",function() {
				var word = this.value;
				var matches=[];
				var i=0;
				//build regext with input
				regexp = new RegExp(word,'i');
				//search 10 first results (sort by length & alpha)
				while(i<sorted.length && matches.length<10) {
					if(regexp.test(sorted[i].name)) {
						matches.push(sorted[i]);
					}
					i++;
				}
				//update list of options
				d3.selectAll('.mtm-searchbox').select('ul')
					.selectAll("li").remove()
				d3.selectAll('.mtm-searchbox').select('ul')
					.style("padding","5px")
					.selectAll("li")
					.data(matches)
					.enter().append("li")
					.on("click",function(d) {
						d3.selectAll(".mtm-search").property("value",d.name)
						d3.selectAll('.mtm-searchbox').select('ul').style("padding","0px 5px")
							.selectAll("li").remove()
						tip("hide",d);
						zoomSkip(d); 
					})
					.on('mouseover', function(d){ tip("show",d); })
					.on('mouseout', function(d){ tip("hide",d); })
					.on("mousemove", function(d) { tip("move"); })
					.text(function(d){ return d.name; }) 
			})
		s.append("div").attr("class","mtm-searchbox mtm-box")
			.append("ul")

		if(verbose){console.timeEnd("bar");}
		return menu.node().offsetHeight;
	}
	
	function configuration(c) {
		if(verbose){console.time("config");}
		var loc = d3.select("#"+c.location).classed("mtm-container",true)
		for (var i in config) {
			var part=loc.append("div").style("display","inline-block").style("vertical-align","top").append("table")
			part.append("tr").append("th").attr("colspan",2).text(i)
			if(config[i].hasOwnProperty("display")) {
				var row = part.append("tr")
				row.append("td").text("display")
				var e = row.append("td").append("input").attr("type","checkbox").attr("id",i+"_display").on("change",function(){return configChange(this);})
				if(config[i].display) {e.property("checked",true)}
			}
			if(config[i].hasOwnProperty("location")) {
				var row = part.append("tr")
				row.append("td").text("location")
				var e = row.append("td").append("input").attr("type","text").attr("id",i+"_location").style("width","120px").on("change",function(){return configChange(this);})
				e.attr("value",config[i].location)
			}
			if(config[i].hasOwnProperty("width")) {
				var row = part.append("tr")
				row.append("td").text("width")
				var e = row.append("td").append("input").attr("type","number").attr("id",i+"_width").style("width","64px").on("change",function(){return configChange(this);})
				e.attr("value",config[i].width)
			}
			if(config[i].hasOwnProperty("height")) {
				var row = part.append("tr")
				row.append("td").text("height")
				var e = row.append("td").append("input").attr("type","number").attr("id",i+"_height").style("width","64px").on("change",function(){return configChange(this);})
				e.attr("value",config[i].height)
			}
			if(config[i].hasOwnProperty("border")) {
				var row = part.append("tr")
				row.append("td").text("border")
				var e = row.append("td").append("input").attr("type","checkbox").attr("id",i+"_border").on("change",function(){return configChange(this);})
				if(config[i].border) {e.property("checked",true)}
			}
			if(config[i].hasOwnProperty("options")) {
				var row = part.append("tr")
				row.append("td").text("options")
				var e = row.append("td").append("input").attr("type","checkbox").attr("id",i+"_options").on("change",function(){return configChange(this);})
				if(config[i].options) {e.property("checked",true)}
			}
			//options//
			if(config[i].hasOwnProperty("color")) {
				var row = part.append("tr")
				row.append("td").text("color by")
				var e = row.append("td").append("select").attr("id",i+"_color").style("width","70px").on("change",function(){return configChange(this);})
				e.append("option").attr("value","taxon").text("taxon")
				e.append("option").attr("value","rank").text("rank")
				e.append("option").attr("value","sample").text("sample")
				e.append("option").attr("value","max").text("majority")
				e.node().value=config[i].color;
			}
			if(config[i].hasOwnProperty("rank")) {
				var row = part.append("tr")
				row.append("td").text("rank")
				var e = row.append("td").append("select").attr("id",i+"_rank").on("change",function(){return configChange(this);})
				e.append("option").attr("value","null").text("--empty--")
				for (var k in ranks) { e.append("option").attr("value",ranks[k]).text(ranks[k])}
				e.node().value=config[i].rank;
			}
			if(config[i].hasOwnProperty("label")) {
				var row = part.append("tr")
				row.append("td").text("labeling")
				var e = row.append("td").append("select").attr("id",i+"_label").style("width","70px").on("change",function(){return configChange(this);})
				e.append("option").attr("value","taxon").text("taxon")
				e.append("option").attr("value","rank").text("rank")
				//e.append("option").attr("value","none").text("none")
				e.node().value=config[i].label;
			}
			if(config[i].hasOwnProperty("upper")) {
				var row = part.append("tr")
				row.append("td").text("upper")
				var e = row.append("td").append("select").attr("id",i+"_upper").style("width","70px").on("change",function(){return configChange(this);})
				e.append("option").attr("value","color").text("color")
				e.append("option").attr("value","gray").text("gray")
				e.node().value=config[i].label;
			}
			if(config[i].hasOwnProperty("depth")) {
				var row = part.append("tr")
				row.append("td").text("depth")
				var e = row.append("td").append("select").attr("id",i+"_depth").on("change",function(){return configChange(this);})
				e.append("option").attr("value","null").text("--all--")
				for (var k in ranks) { e.append("option").attr("value",ranks[k]).text(ranks[k])}
				e.node().value=config[i].depth;
			}
			if(config[i].hasOwnProperty("font")) {
				var row = part.append("tr")
				row.append("td").text("font")
				var e = row.append("td").append("select").attr("id",i+"_font").style("width","70px").on("change",function(){return configChange(this);})
				for (var j=8; j<40; j=j+2) {
					e.append("option").attr("value",j).text(j)
				}
				e.node().value=config[i].font;
			}
			if(config[i].hasOwnProperty("palette")) {
				var row = part.append("tr")
				row.append("td").text("palette")
				var e = row.append("td").append("input").attr("type","text").attr("id",i+"_palette").style("width","120px").on("change",function(){return configChange(this);})
				e.node().value=config[i].palette;
			}
			if(config[i].hasOwnProperty("background")) {
				var row = part.append("tr")
				row.append("td").text("background")
				var e = row.append("td").append("select").attr("id",i+"_background").style("width","70px").on("change",function(){return configChange(this);})
				e.append("option").attr("value","black").text("black")
				e.append("option").attr("value","white").text("white")
				e.node().value=config[i].background;
			}
			if(config[i].hasOwnProperty("mode")) {
				var row = part.append("tr")
				row.append("td").text("mode")
				var e = row.append("td").append("select").attr("id",i+"_mode").style("width","70px").on("change",function(){return configChange(this);})
				e.append("option").attr("value","norm").text("norm")
				e.append("option").attr("value","hits").text("hits")
				e.append("option").attr("value","nodes").text("nodes")
				e.node().value=config[i].mode;
			}
			if(config[i].hasOwnProperty("zoom")) {
				var row = part.append("tr")
				row.append("td").text("zoom")
				var e = row.append("td").append("select").attr("id",i+"_zoom").style("width","70px").on("change",function(){return configChange(this);})
				e.append("option").attr("value","sticky").text("sticky")
				e.append("option").attr("value","fluid").text("fluid")
				e.node().value=config[i].zoom;
			}
			if(config[i].hasOwnProperty("pattern")) {
				var row = part.append("tr")
				row.append("td").text("pattern")
				var e = row.append("td").append("input").attr("type","text").attr("id",i+"_pattern").style("width","120px").on("change",function(){return configChange(this);})
				e.attr("value",config[i].pattern)
			}
		}
		loc.append("div").style("display","inline-block").style("vertical-align","top").append("p").html("<b>Pattern keys</b><br/>#N: name<br/>#I: id<br/>#H: hits<br/>#R: rank<br/>#S: sample<br/>#P: % by sample<br/>#V: % by view").style("margin","0px")
		loc.append("input").attr("type","button").attr("value","Update view").on("click",function(){return setLayout();})

		if(verbose){console.timeEnd("config");}
	}
	
	function treemap(c,p) {
		if(verbose){console.time("treemap");}
		//CONTAINER//
		//create container div//
		var container = d3.select("#"+c.location) //container div
			.classed("mtm-container",true)
			
		//Menu//
		if(c.options) {
			bar(config.bar,c.location,c.width);
		}
		
		//SVG//
		var svg = container.append("svg") //general SVG
				.attr("id","mtm-treemap")
				.attr("height", c.height)
				.attr("width", c.width)
				.style("display","inline-block")//disable bottom padding
				.style("position","relative")
				.style("z-index","1") //View is below
		
		//backgroung
		svg.append("rect")
			.attr("width","100%")
			.attr("height","100%")
			.attr("fill",function(){return config.options.background;})
			.attr("class","mtm-bg")
		
		//group for visual elements
		svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-view",true)

		//group for labels//
		svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-labels",true)
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")			
			
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
			.style("stroke",function(){return config.options.background;})
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
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")
			.style("pointer-events","none")
			.text("Please load json file")
		
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
		
		//Menu//
		if(c.options) {
			bar(config.bar,c.location,c.width);
		}
		
		//table//
		var tab=container.append("div")
				.attr("id","mtm-table")
				.style("height", c.height)
				.attr("width", c.width)
				.style("overflow","auto")
				.style("background-color",function(){return config.options.background;})
				.style("display","inline-block")
				.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")
				.style("font-size","14px")
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
	function updateRects(n) {
		console.log("updateRects",n.name);
		//scale
		x.domain([n.x, n.x + n.dx]);
		y.domain([n.y, n.y + n.dy]);
		var kx = config.options.zoom=="sticky" ? (w / n.dx) : 1;
		var ky = config.options.zoom=="sticky" ? (h / n.dy) : 1;

		//select
		var displayed;
		if(config.treemap.border) { //ancestor + leaves (w>0 & h>0)
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
			.style("stroke",function(){return config.options.background;})
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
		var kx = config.options.zoom=="sticky" ? (w / n.dx) : 1;
		var ky = config.options.zoom=="sticky" ? (h / n.dy) : 1;

		//select
		var labelled;
		if(config.options.label=="rank" && rank!=-1) { //show selected group || upper leaves
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
				.html(function(d){
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

	function updateLines(n) {
		//Fill table
		if(verbose){console.time("growTable");}
		//var hundread = root.data.hits;
		var nodes = d3layout.nodes(); //getSubtree(root,[]);
		
		//delete old lines
		var view = d3.select("#mtm-table").select(".mtm-view").html("");
		//create tr and td
		view.selectAll("tr").data(nodes).enter().append("tr")
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
		view.selectAll(".name").data(nodes)
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
		view.selectAll(".id").data(nodes)
				.style("width","70px").style("text-align","right")
				.append("span")
				.filter(function(d){return +d.id>0})
					.append("a")
					.attr("href",function(d){ return "http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id="+d.id;})
					.attr("target", "taxonomy")
					.text(function(d){return d.id})
		//fill hits
		view.selectAll(".hits").data(nodes)
				.style("width","60px").style("text-align","right")
				.append("span").text(function(d){return d.data.hits;})
		//fill %
		view.selectAll(".percent").data(nodes)
				.style("width","60px").style("text-align","right")
				.append("span")
				//.text() fill in zoom()
		//fill sample
		view.selectAll(".sample").data(nodes)
				.style("width","80px").style("text-align","right")
				.append("span").html(function(d){
					return d.data.percent.toFixed(2)+"%/"+d.data.sample+"&nbsp;";
				})
		//fill rank
		view.selectAll(".rank").data(nodes)
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
		rank = ranks.indexOf(config.options.rank) //selected rank
		var getColor;
		console.log("update color, rank:",rank);
		//color by rank : top-down
		if(config.options.color=="rank" && rank!=-1) {
			if(config.options.depth=="null") {colorByRank(rank,root,root);}
			else {colorByRank(rank,tree,tree);}
			getColor = function(d){return d.data.color;}
		}
		//set color
		else if(config.options.color=="max") { //colorByMajority
			getColor = function(d) {
				if(!d.children) {d.data.color = color(d.parent.data.count.indexOf(Math.max(...d.parent.data.count)));}
				else {d.data.color = color(d.data.count.indexOf(Math.max(...d.data.count)));}
				return d.data.color;
			}
		}
		else if(config.options.color=="sample") {
			getColor = function(d) {
				d.data.color = color(d.data.sample);
				return d.data.color;
			}
		}
		else {//default (config.options.color=="taxon")
			getColor = function(d) {
				d.data.color = color(d.id);
				//console.log(d.name,d.id,d.data.color);
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
					if(config.options.upper=="gray") {
						n.children[i].data.color = "#888";
					}
					else {n.children[i].data.color = color(n.children[i].id);} //taxon
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

		if(config.options.zoom=="fluid") {
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
			if(config.options.label=="rank" && rank!=-1){
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
