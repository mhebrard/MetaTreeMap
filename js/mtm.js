!(function() {

	var mtm = { version: "2.3.3" };
	var verbose=false;

	//VARIABLES//
	//this product includes color specifications and designs developed by Cynthia Brewer (http://colorbrewer.org/).
	var colorbrewer = {Set3: { 12: ["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5","#d9d9d9","#bc80bd","#ccebc5","#ffed6f"]
	}};
	
	//need to compute json
	//functions completeTree, relatives, sumHits, merge
	var config; //object configuration
	var ranks = ["no rank","superkingdom","kingdom","subkingdom","superphylum","phylum","subphylum","superclass","class","subclass","infraclass","superorder","order","suborder","infraorder","parvorder","superfamily","family","subfamily","tribe","subtribe","genus","subgenus","species group","species subgroup","species","subspecies","varietas","forma"];
	var root; //object root (all tree)
	var bkeys, //list of keys for bridges
	bobjs; //list of node -object- for bridge
	
	//neet to initiate layout
	//function setLayout
	var node; //current node displayed
	var color=""; //color set for leaves
	var d3layout; //d3 layout
	var w=1,h=1; //treemap dimensions
	var sorted; //taxa names for search
	
	//need to layout
	var x,y; //scales
	var kx=1,ky=2; //zoom ratio
	
	var touched=""; //node for touch event
	
	var tags; //treemap labels format 
	//tip; //treemap tooltip
	
	//METHODS//
/*	mtm.treemap = function(location,width,height,menu,labels) {
		map=true; //activate treemap
		//default menu is true 
		menu==false ? menu=false : menu=true;
		//set labels format
		labels ? tags = labels : tags="$N"; 
		
		//CONTAINER//
		//create container div//
		var container = d3.select("#"+location) //container div
			.append("div")
			.classed("mtm",true)
			.classed("mtm-map",true)
			.style("width", width + "px")
		
		//create menu bar//		
		if(menu) {
			container.insert("div").attr("id","mtm-menu-container");
			mtm.menu("mtm-menu-container",width);
		}
		
		//VARIABLES//
		var margin = {top:20, right:0, bottom:0, left:1}; //margin inner final svg
		if(menu) { h = height - margin.top - margin.bottom - 
			d3.select("#mtm-menu-container").node().offsetHeight; } //svg height with menu
		else { h = height - margin.top - margin.bottom; } //svg height without menu 
		w = width - margin.right - margin.left; //int = final map width
		x = d3.scale.linear().range([0, w]), //x scale from data to map
		y = d3.scale.linear().range([0, h]); //y scale from data to map	
		
		//TOOLTIP//
		tip = d3.tip()
			.attr('id', 'd3-tip')
			.direction(function(d) {
				var pos="";//switch est/west at half + limit of 1/4 each side
				(d.y<node.y+node.dy/2) ? ( (d.y+d.dy > (node.y+node.dy)*3/4) ? pos=pos : pos=pos+"s" ) : pos=pos+"n";
				(d.x<node.x+node.dx/2) ? ( (d.x+d.dx > (node.x+node.dx)*3/4) ? pos=pos : pos=pos+"e" ) : pos=pos+"w";
				return pos ? pos : "s"; //for header: "s"
			})
			.html(function(d) {		
				return d.name+"<br/>Taxonomy ID: "+(+d.id > 0 ? d.id :"")
					+"<br/>Rank: "+d.data.rank
					+"<br/>"+d.data.hits+" hits"
					+"<br/>"+d.data.percent.toFixed(2)
					+"% of sample "+d.data.sample
					+"<br/>"+(d.value*100/node.value).toFixed(2) 
					+"% of the view";				
			})	
		//SVG//
		var content = container.append("div")
			.classed("mtm-content",true)
			.append("svg") //general SVG
				.attr("display","block")//disable bottom padding
				.attr("width", w + margin.left + margin.right)
				.attr("height", h + margin.top + margin.bottom);
			
		content.append("rect")//backgroung
			.attr("width","100%")
			.attr("height","100%")
			.attr("fill","#000")
			.attr("class","mtm-bg");
				
		var svg = content.append("g")//general group
			.attr("transform", "translate(" + margin.left + "," + (margin.top) + ")")
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace");
		
		//group for rectangles//
		svg.append("g")
			.classed("mtm-view",true)
			.call(tip); //call tooltip
			
		//rect for highlight//
		svg.append("rect")
			.classed("mtm-hl",true)
			.style("stroke","#000")
			.style("stroke-width","5")
			.style("fill","none")
			.style("pointer-events","none");

		//group for labels//
		svg.append("g")
			.classed("mtm-labels",true)
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace");
			
		//group for header (current zoom)//
		var header = svg.append("g")
			.classed("mtm-header",true)
			.on('mouseover', tip.show)
			.on('mouseout', tip.hide)
			.style("font-size",font+"px")
		//create visual element rect
		header.append("rect")
			.attr("y", -margin.top) //child of root g, moved on margin.top
			.attr("width", w - margin.right - margin.left)
			.attr("height", margin.top - margin.bottom-1) //border-bottom
			.style("fill","#888").style("stroke","black")
		//create text element
		header.append("text")
			.attr("x", 6)
			.attr("y", 4 - margin.top)
			.attr("dy", ".75em")
			.text("Please load json file (add mtm.load('data/yourFile.json');)");
	}//end function treemap
*/		
/*	mtm.table = function(location,width,height,menu) {
		table=true; //activate table
		//if(map){no menu} else{menu} by default:false.
		if(menu==false || hasMenu) { menu=false; }
		else { menu=true; }
		
		var container = d3.select("#"+location) //container div
			.append("div")
			.classed("mtm",true)
			.classed("mtm-table",true)
			.style("width", width-2 + "px") //border left|right 1px
			
		//manage menu
		var rowsh; //height of mtm-content
		if(menu) { 	
			container.insert("div").attr("id","mtm-menu-container");
			mtm.menu("mtm-menu-container",width);
			rowsh = height-2-d3.select("#mtm-menu-container").node().offsetHeight;//border up|down 1px
		}
		else {rowsh = height-2;} //border up|down 1px
		
		var rows = container.append("div")
			.classed("mtm-content",true)
			.style("height",rowsh)
			.style("overflow","auto")
		
		//thead
		var thead = rows.append("div")
			.append("table")
			.append("tr")
			.classed("mtm-header",true);
		thead.append("th").text("Node");
		thead.append("th").style("width","70px").style("text-align","right").text("Taxon_ID");
		thead.append("th").style("width","60px").style("text-align","right").text("Hits");
		thead.append("th").style("width","60px").style("text-align","right").text("%/View");
		thead.append("th").style("width","80px").style("text-align","right").html("%/Sample&nbsp;");
		thead.append("th").style("width","130px").style("text-align","left").text("Rank");
		thead.append("th").style("width","15px").text("");//scroll bar

		//tbody
		rows.append("div")
			.style("height",(rowsh-thead.node().offsetHeight)+"px")
			.style("overflow","auto")
			.attr("class","mtm-scrollable")
			.append("table")
			.classed("mtm-view",true)
			.classed("mtm-labels",true)
			.style("table-layout","fixed")
	}
*/	
	mtm.load = function(files,conf) {
if(verbose){console.time("load");}
		//hasMenu=false;
		//map=table=false;
		//root init.
		root={"name":"root","children":[],"data":{"hits":0,"rank":"no rank","sample":0},"id":"1"}; //skeleton tree
		bkeys = [root.id]; //list of keys of nodes
		bobjs = [root]; //list of node -object-
		
		//loading config file
		if(conf) { d3.json(URL.createObjectURL(conf),function(c) {config=c;}); }
		else if (!config) { d3.json("./mtm-config.json",function(c) {config=c;});}
		
		//Loading input files
		var queue = files.length; //counter
		var hundreds = []; //samples total reads
		for (var i=0; i < files.length; i++) {
			d3.json(files[i], function(di) {
				hundreds[(i-queue+1)]=+di.data.sum;
				merge(di,"",(i-queue+1),hundreds); //Create skeleton and leaves (root,parent,sample)
				if(!--queue) {
					hundreds[0]= hundreds.reduce(function(a,b) {return a + b;});
if(verbose){console.time("completeTree");}
					completeTree(root,hundreds); //Add 1 node by rank + sum hits
if(verbose){console.timeEnd("completeTree");}
					setLayout();
				} 
			});
		}
if(verbose){console.timeEnd("load");}
	}   

/*	mtm.config = function(conf) {
		if(conf.mtm){
			if(conf.mtm.group) {
				d3.select("#mtm-group").node().value=conf.mtm.group;
			}
			if(conf.mtm.rank) {
				d3.select("#mtm-phylogeny").node().value=ranks.indexOf(conf.mtm.rank);
			}
			if(conf.mtm.labels) {
				d3.select("#mtm-label").attr("class",conf.mtm.labels);
			}
			if(conf.mtm.upper) {
				d3.select("#mtm-upper").attr("class",conf.mtm.upper);
			}
			if(conf.mtm.font) {
				d3.select("#mtm-font").node().value=conf.mtm.font;
			}
			if(conf.mtm.palette) {
				if(conf.mtm.palette=="20") {
					d3.select("#mtm-color").attr("class","off");
					color = d3.scale.category20c();
				}
				else {
					d3.select("#mtm-color").attr("class","on");
					color = d3.scale.ordinal().range(colorbrewer.Set3[12]);
				}
			}
			if(conf.mtm.background) {
				if(conf.mtm.background=="white") {
					d3.select("#mtm-background").attr("class","off");
					d3.selectAll(".mtm").style("background-color","#fff");
					d3.selectAll(".mtm-header rect").style("stroke","#fff");
					d3.selectAll(".mtm-bg").style("fill","#fff");
				}
				else {
					d3.select("#mtm-background").attr("class","on");
					d3.selectAll(".mtm").style("background-color","#000");
					d3.selectAll(".mtm-header rect").style("stroke","#000");
					d3.selectAll(".mtm-bg").style("fill","#000");
				}
			}
			if(conf.mtm.size) {
				d3.select("#mtm-size").node().value=conf.mtm.size;
			}
		}
	}
*/	
/*	mtm.toggle = function toggle(nid) {
		var sel = d3.select(".mtm-table").select(".t"+nid);
		var span = sel.select(".fa");
		var d = sel.datum();
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
*/		
/*	mtm.menu = function(location,width) {
		hasMenu=true; //activate menu
			
		//create menu bar//
		var menu = d3.select("#"+location) //container div
			.append("div")
			.attr("id","mtm-menu")
			.classed("mtm",true)
		if(width) { menu.style("width",width + "px"); }
		
		menu.append("span").attr("class","button")
			.append("span").attr("class","fa fa-link")
			.attr("title","Group by...")
			.append("select").attr("id","mtm-group");
		menu.append("span").attr("class","button")
			.append("select").attr("id","mtm-phylogeny");
		menu.append("button").attr("id","mtm-label")
			.append("span").attr("class","fa fa-tag");
		menu.append("button").attr("id","mtm-upper")
			.append("span").attr("class","fa fa-sitemap");
		
		menu.append("button").attr("id","mtm-root")
			.append("span").attr("class","fa fa-home");
		menu.append("span").attr("class","button")
			.append("span").attr("class","fa fa-text-height")
			.append("select").attr("id","mtm-font");
		menu.append("button").attr("id","mtm-color")
			.append("span").attr("class","fa fa-eyedropper");
		menu.append("button").attr("id","mtm-background")
			.append("span").attr("class","fa fa-adjust");
			
		menu.append("span").attr("class","button")
			.append("span").attr("class","fa fa-th")
			.attr("title","Size mode")
			.append("select").attr("id","mtm-size")
			.attr("title","Samples normalized")

		//search bar//
		var search = menu.append("span").attr("class","button")
			.append("span").attr("class","fa fa-search")
			.attr("title","Search a name")
		search.append("input").attr("type","text").attr("id","mtm-search")
			.on("input",function() {
				if (this.value){
					var re= new RegExp(this.value,"i");
					d3.select("#mtm-slist").selectAll("li")
						.style("display","none")
						.filter(function(d) { return d.name.match(re); })
						.style("display","block");
				}
				else {
					d3.select("#mtm-slist").selectAll("li")
						.style("display","none");
				}
			})
		//searchbox//
		var box = d3.select("#mtm-search").node().getBoundingClientRect();
		search.append("div").attr("id","mtm-slist")
			.style("width",box.width+"px")
				
		// MENU EVENT //
		//rank select//
		var s = d3.select("#mtm-phylogeny")
			.on("change",function() {
				if(d3.select("#mtm-group").node().value=="rank") {
					updateColor(root);
				}
				if(d3.select("#mtm-label").node().className=="off") {
					updateLabel();
					zoom(node);
				}
			});
		s.append("option")
			.attr("value","init")
			.text("--Phylogenic rank--");
		for (var k in ranks) {
			s.append("option")
				.attr("value",k)
				.text(ranks[k]);
		}
	
		//gray upper ranks//
		d3.select("#mtm-upper") 
			.attr("class","on")
			.attr("title","Grayed or colored upper ranks")
			.on("click", function() {
				if(this.className=="off" ) {
					this.className="on";
				}
				else {
					this.className="off";
				}
				updateColor(root);
			});
		
		//group by Color option//
		//rank select//
		var s = d3.select("#mtm-group")
			.attr("title","Group by ...")
			.on("change",function() {
				updateColor();
			});
		s.append("option").attr("value","taxon").text("by taxon");
		s.append("option").attr("value","rank").text("by rank");
		s.append("option").attr("value","sample").text("by sample");
		s.append("option").attr("value","max").text("majority");
			
		//labels//
		d3.select("#mtm-label") 
			.attr("class","on")
			.attr("title","Labelling leaves or ranks")
			.on("click", function() {
				if(this.className=="off" ) {this.className="on";}
				else {this.className="off";}
				updateLabel();
				zoom(node);
			});

		//size//
		var s = d3.select("#mtm-size")
			.on("change",function() {
				if(this.value=="norm") { 
					treemap.value(sizeNorm).nodes(root);
					this.title="Samples normalized";
				}
				else if(this.value=="hits") { 
					treemap.value(sizeHits).nodes(root);
					this.title="Number of hits (not normalized)";
				}
				else if(this.value=="nodes") { 
					treemap.value(sizeNodes).nodes(root);
					this.title="All nodes same size";
				}
				zoom(node);
			});
			s.append("option").attr("value","norm").text("norm");
			s.append("option").attr("value","hits").text("hits");
			s.append("option").attr("value","nodes").text("nodes");

		//root//
		d3.select("#mtm-root")
			.attr("class","on")
			.attr("title","Back to root")
			.on("click", function() { 
				this.className="on";
				zoom(root);
			});
		
		//color range//
		d3.select("#mtm-color")
			.attr("class","on")
			.attr("title","Switch from 12 to 20 colors")
			.on("click", function() {
				if(this.className=="off" ) {
					this.className="on";
					color = d3.scale.ordinal().range(colorbrewer.Set3[12]);
				}
				else {
					this.className="off";
					color = d3.scale.category20c();
				}
				updateColor();
			});	
			
		//background color//
		d3.select("#mtm-background")
			.attr("class","on")
			.attr("title","Background black or white")
			.on("click", function() {
				if(this.className=="off" ) {
					this.className="on";
					d3.selectAll(".mtm").style("background-color","#000");
					d3.selectAll(".mtm-header rect").style("stroke","#000");
					d3.selectAll(".mtm-bg").style("fill","#000");	
				}
				else {
					this.className="off";
					d3.selectAll(".mtm").style("background-color","#fff");
					d3.selectAll(".mtm-header rect").style("stroke","#fff");
					d3.selectAll(".mtm-bg").style("fill","#fff");
				}
			});

		//font size//
		var s = d3.select("#mtm-font") 
			.attr("title","Font size")
			.on("change",function() {
				font=this.value;
				updateLabel();
				zoom(node);
			}); 
		for (var i=8; i<40; i=i+2) {
			s.append("option")
				.attr("value",i)
				.text(i);
		}
		s.selectAll("option[value='14']").property("selected","true")
	}
*/
/*	mtm.save = function(mode) {
		
		if(mode=="json") {
			copy(root); //format tree for output
			//create file
			var url = 'data:text/json;charset=utf8;filename=output.json,' + encodeURIComponent(JSON.stringify(out));
			//Direct DownLoad call
			ddl("merge.json",url);
		}
		else if(mode=="svg") {
			var svg = d3.select("svg");		
			//add svg header
			var html = d3.select("svg")
				.attr("version", 1.1)
				.attr("xmlns", "http://www.w3.org/2000/svg")
				.node().parentNode.innerHTML;
				
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
				.node();
			var context = canvas.getContext("2d");
			
			//add svg header
			var html = svg.attr("version", 1.1)
				.attr("xmlns", "http://www.w3.org/2000/svg")
				.attr(":xmlns:xlink","http://www.w3.org/1999/xlink")
				.node().outerHTML;
				
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
			var config={"layout":{"treemap":{},"table":{},"options":{}},"mtm":{}};
			
			document.getElementById("tree").checked ? config.layout.treemap.show="yes" : config.layout.treemap.show="no";
			config.layout.treemap.width = document.getElementsByName("treew")[0].value;
			config.layout.treemap.height = document.getElementsByName("treeh")[0].value;
			document.getElementById("treem").checked ? config.layout.treemap.option="yes" : config.layout.treemap.option="no";
			config.layout.treemap.place = document.getElementsByName("treep")[0].value;
			
			document.getElementById("table").checked ? config.layout.table.show="yes" : config.layout.table.show="no";
			config.layout.table.width = document.getElementsByName("tablew")[0].value;
			config.layout.table.height = document.getElementsByName("tableh")[0].value;
			document.getElementById("tablem").checked ? config.layout.table.option="yes" : config.layout.table.option="no";
			config.layout.table.place = document.getElementsByName("tablep")[0].value;
			
			document.getElementById("opt").checked ? config.layout.options.show="yes" : config.layout.options.show="no";
			config.layout.options.width = document.getElementsByName("optw")[0].value;
			document.getElementById("optm").checked ? config.layout.options.option="yes" : config.layout.options.option="no";
			config.layout.options.place = document.getElementsByName("optp")[0].value;
			
			config.mtm.pattern = document.getElementsByName("pattern")[0].value;
			config.mtm.group = d3.select("#mtm-group").node().value;
			config.mtm.rank = ranks[d3.select("#mtm-phylogeny").node().value];
			config.mtm.labels = d3.select("#mtm-label").attr("class");
			config.mtm.upper = d3.select("#mtm-upper").attr("class");
			config.mtm.font = d3.select("#mtm-font").node().value;
			d3.select("#mtm-color").attr("class") == "off" ? config.mtm.palette="20" : config.mtm.palette="12";
			d3.select("#mtm-background").attr("class") == "off" ? config.mtm.background="white" : config.mtm.background="black";
			config.mtm.size = d3.select("#mtm-size").node().value;

			//create file
			var url = 'data:text/json;charset=utf8;filename=mtm-config.json,' + encodeURIComponent(JSON.stringify(config));
			//Direct DownLoad call
			ddl("mtm-config.json",url);
		}
	}
*/	
	mtm.convertor = function(location) {
		//CONTAINER//
		var container = d3.select("#"+location) //container div
			.append("table");
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
	function completeTree(n,h) { 
		//walk through the input tree from root to leaves
		//complete tree: 1 node by rank
		//Sum hits in subtree
		//recursive call
		if (n.children.length>0) {
			var adds=[]; //list of bridges path
			for (var i in n.children) {
				var hits=completeTree(n.children[i],h);
				n.data.hits=+n.data.hits+hits;
				n.data.percent=+n.data.hits*100/h[n.data.sample];
				//complete the tree (one node by phylogeny rank)
				adds.push(relatives(n,n.children[i],h));
			}
			
			//manage edges to bridges
			adds.forEach(function(add) {
				//disconnect parent and child
				add[0].children.splice(
					add[0].children.indexOf(add[1]),1
				);
				//connect parent and medium
				if(add.length==3) {	
					add[0].children.push(add[2]);
				}
			})
		}		
		//for sum hits in subtree
		return n.data.hits;
	}
	
	function relatives(parent,child,h) {
		//add missing node between two : parent -- medium -- child
		var firstChild=child;
		var prank=ranks.indexOf(parent.data.rank);
		var crank=ranks.indexOf(child.data.rank);
		//delta between child rank and parent rank
		var r = crank - prank;
		//for each missing level
		for(r;r>1;r--) {
			var mrank=prank+r-1;
			var mid=parent.id+"_"+mrank;
			
			//test if medium already exist
			var idx = bkeys.indexOf(mid);
			if(idx > -1) { //medium exist
				medium = bobjs[idx];
				//sum child hits to ancestor
				sumHits(parent.id,mrank-1,+child.data.hits,r-1,h);
				r=0; //break loop for missing node
			}
			else { //medium do not exist
				var medium={
					name: ranks[mrank]+" under "+parent.name,
					children: [],
					data: {hits:0, rank:ranks[mrank], sample:0},
					id: mid
				};
				bkeys.push(mid);
				bobjs.push(medium);
			}
			
			//connect child and medium
			medium.children.push(child);
			//sum child hits to medium
			medium.data.hits = +medium.data.hits + +child.data.hits;
			medium.data.percent=+medium.data.hits*100/h[0]

			//loop
			child=medium;
		}
		
		if(r==1) { return [parent,firstChild,child];} //new path
		else if(r==0) { return [parent,firstChild,child]; } // parent-child
		else if(r==-1) { return [parent,firstChild]; } //path already exist
		else { //WARNING:
			console.log("WARNING rank:",r,parent.name,firstChild.name,child.name);
		}
	}
	
	function sumHits(pid,mrank,sum,r,h) {
		//sum hits to ancestor - recursive call
		var mid=pid+"_"+mrank;
		var idx = bkeys.indexOf(mid);
		if(idx>-1) { 
			var m = bobjs[idx];
			m.data.hits = +m.data.hits + sum;
			m.data.percent=+m.data.hits*100/h[m.data.sample];
			if(r>2) { sumHits(pid,mrank-1,sum,r-1,h); }
		}
	}
	
	function merge(n,p,s,h) {
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
			var tag={"name":n.name,
				"children":[],
				"data":{"hits":+n.data.assigned,
					"rank":n.data.rank,
					"sample":s,
					"percent":+n.data.assigned*100/h[s]},
				"id":n.id
			}

			if (n.children.length>0) {tag.name+="*";}
			nsk.children.push(tag);
		}
		
		//recursive call
		if (n.children.length>0) {
			for (var i in n.children) {
				merge(n.children[i],n,s,h);
			}
		}
	}
	
	//VIEW CREATION//
	function setLayout() {
if(verbose){console.time("layout");}
		node=root;
		
		//style
		d3.select("head").append("style").text(
		"#mtm-tip{position:absolute;z-index:10;background-color:#888;border:1px solid #000;border-radius:.2em;padding:3px;font-family:'Source Code Pro','Lucida Console',Monaco,monospace;font-size:14pt;pointer-events:none;opacity:0}\n"
		+".button{background-color:#fff;border-radius:.2em;margin:1px;padding:2px ;font-size:14pt;cursor:pointer;display:inline-table;}\n"
		+".on{color:#000;border:3px solid #000;}\n"
		+".off{color:#888;border:3px solid #888;}\n"
		+".mtm-searchbox{position:absolute;background-color:#888;border:1px solid #fff;border-radius:.2em;}\n"
		+".mtm-searchbox:hover{border: 1px solid black;}\n"
		+".mtm-searchbox ul{margin:0px;padding:0px 5px;}\n"
		+".mtm-searchbox ul li {list-style-type:none;list-style-position:outside;}\n"
		+".mtm-searchbox ul li:hover{background-color:#666;cursor:pointer;}\n"
		);
		
		//set color palette
		if(color==""){ color = d3.scale.ordinal().range(colorbrewer.Set3[12]); }
		
		//hidden div
		d3.select("body").append("div").attr("id","mtm-tip");
		d3.select("body").append("div").attr("id","mtm-canvas").style("display","none");

		//Delete previous views
		d3.selectAll(".mtm-container").html("");
		param={};
		
		//build d3.layout
		computeLayout();
		//sort nodes for search
		sorted = d3layout.nodes().sort(function(a,b) { return a.name.length<b.name.length ? -1 : a.name.length>b.name.length ? 1 : a.name<b.name ? -1 : a.name>b.name ? 1 : 0  ; });
		
		//build views
		if(config.bar) { bar(config.bar); }
		if(config.configuration && config.configuration.display) {
			configuration(config.configuration);
		}
		if(config.table && config.table.display) {
			param.table={};
			table(config.table,param.table);
		}
		if(config.treemap && config.treemap.display) {
			param.treemap={};
			treemap(config.treemap,param.treemap);
		}

		//update
		updateColor();
		updateLabel();
		zoom(node);

if(verbose){console.timeEnd("layout");}
	}
	
	function computeLayout() {
		if(config.treemap.display) {
			h = config.treemap.height - 20;  //margin top
			w = config.treemap.width - 1; //margin left
		}

		//compute final json tree
		d3layout = d3.layout.treemap() //array of all nodes
			.size([w, h]) //size of map
			.round(false) //round the value (for scale)
			.sticky(true) //keep child position when transform
			.value(setMode(config.options.mode));
		var nodes = d3layout.nodes(root);
		
if(verbose){console.log("nodes",nodes.length,"leaves",nodes.filter(function(d){return !d.children;}).length,"root.value",root.value);}
	}
	
	//LAYOUTS//
	function bar(c,location,width) {
		//create menu bar//
		var menu;
		if(location) {
			menu = d3.select("#"+location)
				.classed("mtm-container",true)
				.append("div")
				.classed("mtm-menu",true)
				.style("width",width+"px");
		}
		else if(c.display) {
			menu = d3.select("#"+c.location)
				.classed("mtm-container",true)
				.append("div")
				.classed("mtm-menu",true)
				.style("width",c.width+"px");
		}
		else { 
			menu = d3.select("body")
				.append("div")
				.classed("mtm-menu",true)
				.style("display","none")
		}
		
		//Color By//
		var s = menu.append("span").attr("class","button on")
			.append("span").attr("class","fa fa-link")
			.attr("title","Color by...")
			.append("select").attr("class","mtm-color")
			//options//
			s.append("option").attr("value","taxon").text("by taxon");
			s.append("option").attr("value","rank").text("by rank");
			s.append("option").attr("value","sample").text("by sample");
			s.append("option").attr("value","max").text("majority");
			//value//
			s.property("value",config.options.color)
			s.on("change",function() { 
				//change all button
				d3.selectAll(".mtm-color").property('value',this.value);
				config.options.color=this.value;
				d3.select("#options_color").property('value',this.value);
				//action
				updateColor();
			});
		
		//Phylogenic Rank//
		var s = menu.append("span").attr("class","button on")
			.append("select").attr("class","mtm-phylogeny");
			//options//
			s.append("option").attr("value","init").text("--Phylogenic rank--");
			for (var k in ranks) {
				s.append("option").attr("value",k).text(ranks[k]);
			}
			//value//
			s.property("value",config.options.rank)
			s.on("change",function() {
				//change all button
				d3.selectAll(".mtm-phylogeny").property('value',this.value);
				config.options.rank=this.value;
				d3.select("#options_rank").property('value',this.value);
				//action
				if(d3.select(".mtm-color").node().value=="rank") {
					updateColor();
				}
				if(d3.select(".mtm-label").classed("off")) {
					updateLabel();
					zoom(node);
				}
			});
		
		//Labels//
		menu.append("span").attr("class","button fa fa-tag mtm-label")
			.attr("title","Labelling leaves or ranks")
			.classed("on",function() { return config.options.label=="taxon"; })
			.classed("off",function() { return !config.options.label=="taxon"; })
			.on("click", function() {
				if(d3.select(this).classed("on")) { //turn off = rank
					d3.selectAll(".mtm-label").classed("on",false);
					d3.selectAll(".mtm-label").classed("off",true);
					config.options.label="rank";
					d3.select("#options_label").property('value',"rank");
				}
				else { //turn on = taxon
					d3.selectAll(".mtm-label").classed("on",true);
					d3.selectAll(".mtm-label").classed("off",false);
					config.options.label="taxon";
					d3.select("#options_label").property('value',"taxon");
				}
				updateLabel();
				zoom(node);
			});
		
		//Parents//	
		menu.append("span").attr("class","button fa fa-sitemap mtm-upper")
			.attr("title","Grayed or colored upper ranks")
			.classed("on",function() { return config.options.upper=="color"; })
			.classed("off",function() { return !config.options.upper=="gray"; })
			.on("click", function() {
				if(d3.select(this).classed("on")) { //turn off = gray
					d3.selectAll(".mtm-upper").classed("on",false);
					d3.selectAll(".mtm-upper").classed("off",true);
					config.options.upper="gray";
					d3.select("#options_upper").property('value',"gray");
				}
				else { //turn on = taxon
					d3.selectAll(".mtm-upper").classed("on",true);
					d3.selectAll(".mtm-upper").classed("off",false);
					config.options.upper="color";
					d3.select("#options_upper").property('value',"color");
				}
				updateColor();
			});
			
		//Home//
		menu.append("span").attr("class","button fa fa-home mtm-root")
			.attr("title","Back to root")
			.classed("on",true)
			.on("click", function() { 
				d3.selectAll(".mtm-root").classed("on",true);
				zoom(root);
			});
		
		//Font//
		var s = menu.append("span").attr("class","button on")
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
				d3.selectAll(".mtm-font").property('value',this.value);
				config.options.font=this.value;
				d3.select("#options_font").property('value',this.value);
				//action
				updateLabel();
				zoom(node);
			});

		//Palette//
		menu.append("span").attr("class","button fa fa-eyedropper mtm-palette")
			.attr("title","Switch from 12 to 20 colors")
			.classed("on",function() { return config.options.palette=="12"; })
			.classed("off",function() { return !config.options.palette=="20"; })
			.on("click", function() {
				if(d3.select(this).classed("on")) { //turn off = 20
					d3.selectAll(".mtm-palette").classed("on",false);
					d3.selectAll(".mtm-palette").classed("off",true);
					config.options.palette="20";
					d3.select("#options_palette").property('value',"20");
					color = d3.scale.category20c();
				}
				else { //turn on = 12
					d3.selectAll(".mtm-palette").classed("on",true);
					d3.selectAll(".mtm-palette").classed("off",false);
					config.options.palette="12";
					d3.select("#options_palette").property('value',"12");
					color = d3.scale.ordinal().range(colorbrewer.Set3[12]);
				}
				updateColor();
			});	
			
		//Background//
		menu.append("span").attr("class","button fa fa-adjust mtm-background")
			.attr("title","Switch from 12 to 20 colors")
			.classed("on",function() { return config.options.background=="black"; })
			.classed("off",function() { return !config.options.background=="white"; })
			.on("click", function() {
				if(d3.select(this).classed("on")) { //turn off = white
					d3.selectAll(".mtm-background").classed("on",false);
					d3.selectAll(".mtm-background").classed("off",true);
					config.options.background="white";
					d3.select("#options_background").property('value',"white");
					d3.selectAll(".mtm-bg").attr("fill","#fff");
					d3.selectAll(".mtm-header rect").style("stroke","#fff");
				}
				else { //turn on = black
					d3.selectAll(".mtm-background").classed("on",true);
					d3.selectAll(".mtm-background").classed("off",false);
					config.options.palette="black";
					d3.select("#options_background").property('value',"black");
					d3.selectAll(".mtm-bg").attr("fill","#000");
					d3.selectAll(".mtm-header rect").style("stroke","#000");
				}
			});
			
		//Mode//
		var s = menu.append("span").attr("class","button on")
			.append("span").attr("class","fa fa-th")
			.attr("title","Size mode")
			.append("select").attr("class","mtm-mode")
			//options//
			s.append("option").attr("value","norm").text("norm");
			s.append("option").attr("value","hits").text("hits");
			s.append("option").attr("value","nodes").text("nodes");
			//value//
			s.property("value",config.options.mode)
			s.on("change",function() { 
				//change all button
				d3.selectAll(".mtm-mode").property('value',this.value);
				config.options.mode=this.value;
				d3.select("#options_mode").property('value',this.value);
				//action
				d3layout.value(setMode(config.options.mode));
				d3layout.nodes(root);
				zoom(node);
			});
		
		//Search bar//
		var s = menu.append("span").attr("class","button on")
			.append("span").attr("class","fa fa-search")
			.attr("title","Search a taxon")
		s.append("input").attr("type","text")
			.attr("class","mtm-search")
			.attr("size","17")
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
					.selectAll("li")
					.data(matches)
					.enter().append("li")
					.on("click",function(d) {
						d3.selectAll(".mtm-search").property("value",d.name);
						d3.selectAll('.mtm-searchbox').select('ul')
							.selectAll("li").remove()
						tip("hide",d);
						zoom(d); 
					})
					.on('mouseover', function(d){ tip("show",d); })
					.on('mouseout', function(d){ tip("hide",d); })
					.on("mousemove", function(d) { tip("move"); })
					.text(function(d){ return d.name; }) 
			})
		s.append("div").attr("class","mtm-searchbox")
			.append("ul");
			
		return menu.node().offsetHeight;
	}
	
	function configuration(c) {
		var loc = d3.select("#"+c.location).classed("mtm-container",true);
		for (var i in config) {
			var part=loc.append("div").style("display","inline-block").style("vertical-align","top").append("table")
			part.append("tr").append("th").attr("colspan",2).text(i)
			if(config[i].hasOwnProperty("display")) {
				var row = part.append("tr")
				row.append("td").text("display")
				var e = row.append("td").append("input").attr("type","checkbox").attr("id",i+"_display").on("change",function(){return configChange(this);});
				if(config[i].display) {e.property("checked",true);}
			}
			if(config[i].hasOwnProperty("location")) {
				var row = part.append("tr")
				row.append("td").text("location")
				var e = row.append("td").append("input").attr("type","text").attr("id",i+"_location").style("width","120px").on("change",function(){return configChange(this);});
				e.attr("value",config[i].location);
			}
			if(config[i].hasOwnProperty("width")) {
				var row = part.append("tr")
				row.append("td").text("width")
				var e = row.append("td").append("input").attr("type","number").attr("id",i+"_width").style("width","64px").on("change",function(){return configChange(this);});
				e.attr("value",config[i].width);
			}
			if(config[i].hasOwnProperty("height")) {
				var row = part.append("tr")
				row.append("td").text("height")
				var e = row.append("td").append("input").attr("type","number").attr("id",i+"_height").style("width","64px").on("change",function(){return configChange(this);});
				e.attr("value",config[i].height);
			}
			if(config[i].hasOwnProperty("options")) {
				var row = part.append("tr")
				row.append("td").text("options")
				var e = row.append("td").append("input").attr("type","checkbox").attr("id",i+"_options").on("change",function(){return configChange(this);});
				if(config[i].display) {e.property("checked",true);}
			}
			//options//
			if(config[i].hasOwnProperty("color")) {
				var row = part.append("tr")
				row.append("td").text("color by")
				var e = row.append("td").append("select").attr("id",i+"_color").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","taxon").text("taxon");
				e.append("option").attr("value","rank").text("rank");
				e.append("option").attr("value","sample").text("sample");
				e.append("option").attr("value","max").text("majority");
				e.node().value=config[i].color;
			}
			if(config[i].hasOwnProperty("rank")) {
				var row = part.append("tr")
				row.append("td").text("rank")
				var e = row.append("td").append("select").attr("id",i+"_rank").on("change",function(){return configChange(this);});
				e.append("option").attr("value",29).text("--empty--");
				for (var k in ranks) { e.append("option").attr("value",k).text(ranks[k]);}
				e.node().value=ranks.indexOf(config[i].rank);
			}
			if(config[i].hasOwnProperty("label")) {
				var row = part.append("tr")
				row.append("td").text("labeling")
				var e = row.append("td").append("select").attr("id",i+"_label").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","taxon").text("taxon");
				e.append("option").attr("value","rank").text("rank");
				e.append("option").attr("value","none").text("none");
				e.node().value=config[i].label;
			}
			if(config[i].hasOwnProperty("upper")) {
				var row = part.append("tr")
				row.append("td").text("upper")
				var e = row.append("td").append("select").attr("id",i+"_upper").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","color").text("color");
				e.append("option").attr("value","gray").text("gray");
				e.node().value=config[i].label;
			}
			if(config[i].hasOwnProperty("font")) {
				var row = part.append("tr")
				row.append("td").text("font")
				var e = row.append("td").append("select").attr("id",i+"_font").style("width","70px").on("change",function(){return configChange(this);});
				for (var j=8; j<40; j=j+2) {
					e.append("option").attr("value",j).text(j);
				}
				e.node().value=config[i].font;
			}
			if(config[i].hasOwnProperty("palette")) {
				var row = part.append("tr")
				row.append("td").text("palette")
				var e = row.append("td").append("select").attr("id",i+"_palette").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","12").text("12");
				e.append("option").attr("value","20").text("20");
				e.node().value=config[i].palette;
			}
			if(config[i].hasOwnProperty("mode")) {
				var row = part.append("tr")
				row.append("td").text("mode")
				var e = row.append("td").append("select").attr("id",i+"_mode").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","norm").text("norm");
				e.append("option").attr("value","hits").text("hits");
				e.append("option").attr("value","nodes").text("nodes");
				e.node().value=config[i].mode;
			}
			
		}
		loc.append("input").attr("type","button").attr("value","Update view").on("click",function(){return setLayout();});
	}
	
	function treemap(c,p) {
		//CONTAINER//
		//create container div//
		var container = d3.select("#"+c.location) //container div
			.classed("mtm-container",true)
			//.classed("mtm",true)
			//.style("width",c.width + "px")
			//.style("height",c.height + "px")
			
		//Menu//
		if(c.options) {
			bar(config.bar,c.location,c.width);
		}
		
		
		//SVG//
		var svg;
/*		if(c.menu) { //with menu bar
			//container.insert("div").attr("id","mtm-treemap-menu");
			var opth= bar(config.bar,c.location);
			svg = container.append("svg") //general SVG
				.attr("id","mtm-treemap")
				.attr("height", c.height - opth) //height - option bar
				.attr("width", c.width)
				.style("display","inline-block")//disable bottom padding
			
		}
		else { //without menu bar
*/
			svg = container.append("svg") //general SVG
				.attr("id","mtm-treemap")
				.attr("height", c.height)
				.attr("width", c.width)
				.style("display","inline-block")//disable bottom padding
/*		}*/
		
		//VARIABLES//
		x = d3.scale.linear().range([0, w]); //x scale from data to map
		y = d3.scale.linear().range([0, h]); //y scale from data to map	
		
		//backgroung
		svg.append("rect")
			.attr("width","100%")
			.attr("height","100%")
			.attr("fill","#000")
			.attr("class","mtm-bg");
		
		//group for visual elements
		var view = svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-view",true)
			//.call(tip); //call tooltip
		
		//visual elements
		var leaves = d3layout.nodes().filter(function(d) { return !d.children; });
		view.datum(root).selectAll("rect")
			.data(leaves)
			.enter().append("rect")
			.attr("class",function(d){ return "v"+d.id+"-"+d.data.sample;},true)
			.on("click", function(d) {
				if(touched=="") {//mouse click or 2nd touch
					highlightMap(d,false);
					tip("hide",d);
					zoom(node != d.parent ? d.parent : root);
					//zoomSkip(d);
				}
			})
			.on('mouseover', function(d){
					highlightMap(d,true);
					tip("show",d);
				})
			.on('mouseout', function(d){
					highlightMap(d,false);
					tip("hide",d);
				})
			.on("mousemove", function(d) { tip("move"); })
			.on("touchstart", handleTouch)
			
			
		//group for labels//
		svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-labels",true)
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace");			
			
		//group for header (current zoom)//
		var header = svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-header",true)
		//create visual element rect
		header.append("rect")
			.datum(node)
			.attr("y", -20) //child of root g, moved on margin.top
			.attr("width", c.width - 1)
			.attr("height", 20-1) //border-bottom
			.style("fill","#888").style("stroke","black")
			.on('mouseover', function(d){ tip("show",d); })
			.on('mouseout', function(d){ tip("hide",d); })
			.on("touchstart", handleTouch)
			.on("mousemove", function(d) { tip("move"); })
		//create text element
		header.append("text")
			.attr("x", 6)
			.attr("y", -18)
			.attr("dy", ".75em")
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")
			.text("Please load json file (add mtm.load('data/yourFile.json');)");	

		//rect for highlight//
		svg.append("rect")
			.classed("mtm-hl",true)
			.style("stroke","#000")
			.style("stroke-width","5")
			.style("fill","none")
			.style("pointer-events","none");
	}
	
	function table(c,p) {
		
		var container = d3.select("#"+c.location) //container div
			.classed("mtm-container",true)
			.style("width",c.width + "px")
			//.append("div")
			//.classed("mtm",true)
			//.classed("mtm-table",true)
			//.style("width", c.width-2 + "px") //border left|right 1px
		
		//manage menu bar
		var headh;
		if(c.menu) { //with menu bar
			container.insert("div").attr("id","mtm-table-menu");
			bar(config.bar,"mtm-table-menu",c.width);
			headh = c.height-2-d3.select("#mtm-table-menu").node().offsetHeight; //height - borders - menu
		}
		else { //without menu bar
			headh = c.height-2;
		}
		
		//table//
		var tab=container.append("div")
				.attr("id","mtm-table")
				.attr("height", headh )
				.attr("width", c.width-2)
				.style("overflow","auto")
				
		//thead
		var thead = tab.append("div")
			.append("table")
			.append("tr")
			.classed("mtm-header",true);
		thead.append("th").text("Node");
		thead.append("th").style("width","70px").style("text-align","right").text("Taxon_ID");
		thead.append("th").style("width","60px").style("text-align","right").text("Hits");
		thead.append("th").style("width","60px").style("text-align","right").text("%/View");
		thead.append("th").style("width","80px").style("text-align","right").html("%/Sample&nbsp;");
		thead.append("th").style("width","130px").style("text-align","left").text("Rank");
		thead.append("th").style("width","15px").text("");//scroll bar

		//tbody
		tab.append("div")
			.style("height",(headh-thead.node().offsetHeight)+"px")
			.style("overflow","auto")
			.attr("class","mtm-scrollable")
			.append("table")
			.classed("mtm-view",true)
			.classed("mtm-labels",true)
			.style("table-layout","fixed")
			
		growTable();
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
				});
//			highlightMap(d,true);
		}
		else if(state=="hide") {
			d3.select("#mtm-tip").style("opacity",0);
//			highlightMap(d,false);
		}
		else { // move
			d3.select("#mtm-tip").style("top", (d3.event.pageY-10)+"px")
            .style("left", (d3.event.pageX+10)+"px");
		}
	}
	
/*	function growMap() {
if(verbose){console.time("growMap");}
		//leaves		
		var leaves = treemap.nodes().filter(function(d) { return !d.children; });
		d3.select(".mtm-map").select(".mtm-view").selectAll("rect")
			.data(leaves).enter().append("rect")
				.attr("class",function(d){ return "v"+d.id+"-"+d.data.sample;},true)
				.on("click", function(d){ 
					if(touched=="") {//mouse click or 2nd touch
						highlightMap(d,false);
						tip.hide(d);
						zoom(node != d.parent ? d.parent : root)
					}
				})
				.on('mouseover', function(d){ 
					highlightMap(d,true);
					tip.show(d);
				})
				.on('mouseout', function(d){ 
					highlightMap(d,false);
					tip.hide(d);
				})
				.on('touchstart', handleTouch);
				
if(verbose){console.timeEnd("growMap");}
	}
*/	
	
	function configChange(elem) {
		vals=elem.id.split(/_/);
		if(elem.type=="checkbox") {
			if(elem.checked){ config[vals[0]][vals[1]]=true; }
			else { config[vals[0]][vals[1]]=false; }
		}
		else if(vals[1]=="rank") {
			if(elem.value==29) {config[vals[0]][vals[1]]="null";}
			else {config[vals[0]][vals[1]]=ranks[elem.value];}
		}
		else { config[vals[0]][vals[1]]=elem.value; }
	}
	
	function handleTouch(d) { touched==d ? touched="": touched=d; }
	
	function growTable() {
if(verbose){console.time("growTable");}
		//100%
		var hundread = root.data.hits;
		var view = d3.select(".mtm-table").select(".mtm-view");
		var nodes = d3layout.nodes();
		
		//create tr and td
		d3.select(".mtm-table").select(".mtm-view")
			.selectAll("tr").data(nodes).enter().append("tr")
				.attr("class",function(d){return "v"+d.id+"-"+d.data.sample+" t"+d.id+"-"+d.data.sample;})
				.attr("title",function(d){return d.name;})
				.on("mouseover",function(d) { 
					highlightTable(d,true); 
				})
				.on("mouseout",function(d) {
					highlightTable(d,false);
				})
				.selectAll("td").data(["name","id","hits","percent","sample","rank"]).enter().append("td")
					.attr("class",function(d){return d;})

		//fill name
		d3.select(".mtm-table").select(".mtm-view")
			.selectAll(".name").data(nodes)
			.style("white-space","nowrap")
			.style("overflow","hidden")
			.style("text-overflow","ellipsis")
			.append("span")
				.style("padding-left",function(d){return (+d.depth*4)+"px";})
				.html(function(d){return "<span class='fa'>&nbsp;</span>";})
				.append("span")
					.on("click", function(d){  
						highlightTable(d,false);
						return zoom(node != d ? d : root);
					})
					.text(function(d){return d.name;});
		//fill id
		d3.select(".mtm-table").select(".mtm-view")
			.selectAll(".id").data(nodes)
				.style("width","70px").style("text-align","right")
				.append("span")
				.filter(function(d){return +d.id>0})
					.append("a")
					.attr("href",function(d){ return "http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id="+d.id;})
					.attr("target", "taxonomy")
					.text(function(d){return d.id});
		//fill hits
		d3.select(".mtm-table").select(".mtm-view")
			.selectAll(".hits").data(nodes)
				.style("width","60px").style("text-align","right")
				.append("span").text(function(d){return d.data.hits;})
		//fill %
		d3.select(".mtm-table").select(".mtm-view")
			.selectAll(".percent").data(nodes)
				.style("width","60px").style("text-align","right")
				.append("span")
				//.text() fill in zoom()
		//fill sample
		d3.select(".mtm-table").select(".mtm-view")
			.selectAll(".sample").data(nodes)
				.style("width","80px").style("text-align","right")
				.append("span").html(function(d){
				return d.data.percent.toFixed(2)+"%/"+d.data.sample+"&nbsp;";})
		//fill rank
		d3.select(".mtm-table").select(".mtm-view")
			.selectAll(".rank").data(nodes)
				.style("width","130px")
			.append("span").text(function(d){return d.data.rank;});

		//internal nodes
		d3.select(".mtm-table").select(".mtm-view").selectAll("tr")
			.filter(function(d){return d.children;})
			.select(".fa")
				.attr("onclick",function(d){return "mtm.toggle('"+d.id+"-"+d.data.sample+"',this)";});
if(verbose){console.timeEnd("growTable");}				
	}
	
	//VIEW UPDATE//
	function updateColor() {
if(verbose){console.time("updateColor");}
		rank = d3.select(".mtm-phylogeny").property("value"), //selected rank
		upper = d3.select(".mtm-upper").classed("on"); //option upper nodes
		group = d3.select(".mtm-color").property("value"); //Color mode
		
		if(config.treemap.display) { setColorMap(rank,upper,group); }
		if(config.table.display) {	setColorTable(rank,upper,group); }
if(verbose){console.timeEnd("updateColor");}
	}

	function setColorMap(rank,upper,group) {
if(verbose){console.time("setColorMap");}
		var rects = d3.select("#mtm-treemap").select(".mtm-view").selectAll("rect");
		if(group=="taxon") {
			rects.style("fill",function(d){return color(d.parent.name);});
		}
		else if(group=="rank") {
			//upper color
			rects.style("fill",function(d){return color(d.parent.name);});
			//list of node on the selected rank
			d3layout.nodes().filter(function(d){return d.data.rank == ranks[+rank] && d.children})
				.forEach(function(d) {
					//list of leaves for each subtree
					var subleaves = getSubtree(d,[]).filter(function(d){return !d.children});
					rects.data(subleaves,function(d){return "v"+d.id+"-"+d.data.sample;})
						.style("fill",color(d.name));				
				});
		}
		else if(group=="sample") {
			rects.style("fill",function(d){return color(d.data.sample);});
		}
		else { //if(group=="max")
			rects.style("fill",function(d){
				var major = d;
				for (var i in d.parent.children) {
					if(!d.parent.children[i].children) {
						major= d.parent.children[i].data.hits> major.data.hits ? d.parent.children[i] : major;
					}
				}
				return color(major.data.sample);
			});
		}
		
		// gray upper
		if(!upper) {
			rects.filter(function(d){return rank>=d.depth})
				.style("fill","#888");
		}
if(verbose){console.timeEnd("setColorMap");}
	}
	
	function setColorTable(rank,upper,group) {
if(verbose){console.time("setColorTable");}
		var pcol,phits; //previous color and sum
		var lines = d3.select(".mtm-table").select(".mtm-view").selectAll("tr");
		var subs = []; //list of descendant.
		if(group=="taxon") {
			// bottom > up
			for (var i=lines[0].length;i>0;i--){
				d3.select(lines[0][i]).style("background-color",function(d){
					if(!d.children) {
						phits=d.data.hits;
						pcol=color(d.parent.name);				
					}
					else if(d.data.hits!=phits) {
						pcol=color(d.name);
						phits=d.data.hits;	
					}
					return pcol;
				});
			}//end bottom > up					
		}
		else if(group=="rank") {
			// bottom > up
			for (var i=lines[0].length;i>0;i--){
				d3.select(lines[0][i]).style("background-color",function(d){
					//Selected rank : new color for all the descendant
					if(rank==d.depth-1){
						pcol=color(d.name);
						phits=d.data.hits;
						for(tr in subs){		
							d3.select(subs[tr]).style("background-color",pcol);
						}
						subs=[];
					}
					//Descendant
					else if (rank<d.depth-1) {
							subs.push(lines[0][i]);
					}
					//Initial color
					else {
						//leaf
						if(!d.children) {
							phits=d.data.hits;
							pcol=color(d.parent.name);				
						}
						//node if assigned=0 & sum = previous > same color. ELSE new color
						else if(d.data.hits!=phits) {
							pcol=color(d.name);
							phits=d.data.hits;	
						}
					}
					return pcol;
				});
			}//end bottom > up
		}
		else if(group=="sample"){
			lines.style("background-color",function(d){ return color(d.data.sample); });
		}
		else { // if(group=="max"){
			//leaves
			lines.filter(function(d){return !d.children;}).style("background-color",function(d){ 
				var major = d;
				for (var i in d.parent.children) {
					if(!d.parent.children[i].children) {
						major= d.parent.children[i].data.hits> major.data.hits ? d.parent.children[i] : major;
					}
				}
				return color(major.data.sample);
			});
			//nodes
			lines.filter(function(d){return d.children;}).style("background-color",function(d){ 
				var major = {data:{hits:0,sample:0}}; //d.children[0];
				for (var i in d.children) {
					if(!d.children[i].children) {
						major= d.children[i].data.hits> major.data.hits ? d.children[i] : major;
					}
				}
				return color(major.data.sample);
			});
		}

		//root
		d3.select(lines[0][0]).style("background-color","#888");
		// gray upper
		if(!upper) {
			lines.filter(function(d){return rank>=d.depth})
				.style("background-color","#888");
		}
if(verbose){console.timeEnd("setColorTable");}
	}

	function updateLabel() {
if(verbose){console.time("updateLabel");}

		var rank = d3.select(".mtm-phylogeny").property("value"); // selected rank 
		var label = d3.select(".mtm-label").classed("on");
		if(config.treemap.display) {
			//font size
			d3.select("#mtm-treemap").select(".mtm-labels").style("font-size",config.options.font+"px");
			d3.select("#mtm-tip").style("font-size",config.options.font+"px");
			setLabelMap(rank,label);
		}
		if(config.table.display) { 
			d3.select(".mtm-table").selectAll(".name").style("font-size",config.options.font+"px");
			setLabelTable(rank,label);
		}
if(verbose){console.timeEnd("updateLabel");}
	}

	function setLabelMap(rank,label) {
if(verbose){console.time("setLabelMap");}
		//delete previous labels
		var labels = d3.select("#mtm-treemap").select(".mtm-labels").html("");
		
		//select
		var labelled;
		if(!label) { //show selected group || upper leaves
			labelled=d3layout.nodes(root).filter(function(d){
				return (rank == +d.depth-1) || (!d.children && rank > +d.depth)
			});
		}
		else { //label for each tags
			labelled=d3layout.nodes(root).filter(function(d){return !d.children;});
		}
		
		//guides
		labels.selectAll("path")
			.data(labelled)
			.enter().append("path")
				.attr("id",function(d){return "map"+d.id+d.data.sample;})
				.style("opacity",0)
				.style("pointer-events","none")
		
		//text
		labels.selectAll("text")
			.data(labelled)
			.enter().append("text")
				.attr("class",function(d){return "t"+d.id;})
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
if(verbose){console.timeEnd("setLabelMap");}
	}

	function setLabelTable(rank,label) {
if(verbose){console.time("setLabelTable");}
		var lines = d3.select(".mtm-table").select(".mtm-labels").selectAll("tr");	
		if(!label && rank!="init"){
			//collapse rank
			lines.filter(function(d){return rank == +d.depth-1;})
				.style("display","table-row")
				.select(".fa").attr("class","fa fa-plus-square-o");
			//expand upper
			lines.filter(function(d){return rank>=+d.depth;})
				.style("display","table-row")
				.select(".fa").attr("class","fa fa-minus-square-o");
			//hide lower
			lines.filter(function(d){return rank<+d.depth-1;})
				.style("display","none");
		}
		else { //expand all
			lines.style("display","table-row")
				.select(".fa").attr("class","fa fa-minus-square-o");		
		}
		//leaf
		lines.filter(function(d){return !d.children;})
			.select(".fa").attr("class","fa fa-square-o");
if(verbose){console.timeEnd("setLabelTable");}
	}
	
	function highlightMap(n,toggle) {
		if(toggle && n.parent){ //mouseover
			d3.selectAll(".v"+n.id+"-"+n.data.sample).style("opacity",".7");
			d3.selectAll(".mtm-hl")
				.attr("x",x(n.parent.x)+1+2) 
				.attr("y",y(n.parent.y)+20+2) //+header
				.attr("width",(kx*n.parent.dx)-5)
				.attr("height",(ky*n.parent.dy)-5);
			//highlight stroke  = 5px >  x|y +2 = inside
			//highlight stroke  = 5px >  dx|dy -5 = inside
		}
		else { //mouseout
			d3.selectAll(".v"+n.id+"-"+n.data.sample).style("opacity","1");
			d3.selectAll(".mtm-hl")
				.attr("x",0) 
				.attr("y",0)
				.attr("width",0)
				.attr("height",0);
		}
	}
	
	function highlightTable(n,toggle) {
		if(toggle){ 
			d3.selectAll(".v"+n.id+"-"+n.data.sample).style("opacity",".7");
			if(config.treemap.display) { 
				if(n.children) { //skeleton
					d3.selectAll(".mtm-hl")
						.attr("x",x(n.x)+2) 
						.attr("y",y(n.y)+2)
						.attr("width",(kx*n.dx)-5)
						.attr("height",(ky*n.dy)-5);
				}
				else { //leaf
					d3.selectAll(".mtm-hl")
						.attr("x",x(n.parent.x)+2) 
						.attr("y",y(n.parent.y)+2)
						.attr("width",(kx*n.parent.dx)-5)
						.attr("height",(ky*n.parent.dy)-5);
				}
			}
		}
		else {
			d3.selectAll(".v"+n.id+"-"+n.data.sample).style("opacity","1");
			if(config.treemap.display) { 
				d3.selectAll(".mtm-hl")
					.attr("x",0) 
					.attr("y",0)
					.attr("width",0)
					.attr("height",0);
			}
		}
	}
	
	function hide(n) {
		//hide current raw and recursive
		d3.select(".mtm-table").selectAll(".t"+n.id+"-"+n.data.sample)
			.style("display","none");
		//recursive call
		if (n.children) {
			for (var i in n.children) {
				hide(n.children[i]);
			}
		}		
	}
		
	function show(n) {
		//show current raw and recursive
		var t = d3.select(".mtm-table").select(".t"+n.id+"-"+n.data.sample)
					.style("display","table-row");
		if(t.select(".fa").classed("fa-minus-square-o") && n.children) {
			for (var i in n.children) {
				show(n.children[i]);
			}
		}
	}
	
	function zoom(n) {
if(verbose){console.time("zoom");}
		//button root switch
		if (n==root) {
			d3.selectAll(".mtm-root").classed("on",true);
			d3.selectAll(".mtm-root").classed("off",false);
		}
		else { 
			d3.selectAll(".mtm-root").classed("on",false);
			d3.selectAll(".mtm-root").classed("off",true); 
		}
		
		//update header
		d3.select("#mtm-treemap").select(".mtm-header")
			.datum(n)
			.on("click", function(d) { 
				return zoom(node != d.parent ? d.parent : root); 
			})
			.on('touchstart', function(d) {
					d3.event.preventDefault();
					if(touched==d) { //second touch
						touched="";		
						tip("hide",d);
						return zoom(node != d.parent ? d.parent : root);
					}
					else { //first touched
						if(touched!=""){ //opacity
							d3.selectAll(".v"+touched.id+"-"+touched.data.sample).style("opacity","1");
							highlightMap(touched,false);
						}
						touched=d;
						tip("show",d);
					}
				})
			.select("text")
				.text(function(d) { return d.name; });
		
		//update map	
		if(config.treemap.display) {
if(verbose){console.time("zoomMap");}			
			kx = w / n.dx, ky = h / n.dy;
			x.domain([n.x, n.x + n.dx]);
			y.domain([n.y, n.y + n.dy]);
				
			//all rect position and size
			var rectTranslate = d3.svg.transform()
				.translate(function(d) { return [x(d.x), y(d.y)] });
				
			d3.select("#mtm-treemap").select(".mtm-view").selectAll("rect")
				.transition()
				.duration(1500)
				.attr("transform", rectTranslate)
				.attr("width", function(d) { return kx * d.dx - 1; })
				.attr("height", function(d) { return ky * d.dy - 1; })
				
			//subfunction for labels guide
			function line(d) {
				var ax,ay,bx,by;
				//margin width and height
				var mw=Math.round(config.options.font*0.6); //SourceCodePro
				var mh=Math.round(config.options.font*1.3); //SourceCodePro 
				//rect width and heigth
				var rw=kx * d.dx - 1;
				var rh=ky * d.dy - 1;

				if(rw<rh) {//vertical
					ax=x(d.x+(d.dx/2));
					ay=y(d.y);
					bx=ax;
					by=y(d.y+d.dy);
					//margin && min width
					if(ay+mw<by-mw && rw>mh) { ay=ay+mw; by=by-mw;} 
					else {by=ay;}
				}
				else { //horizontal
					ax=x(d.x);
					ay=y(d.y+(d.dy/2));
					bx=x(d.x+d.dx);
					by=ay;
					//margin && min height
					if(ax+mw<bx-mw && rh>mh) { ax=ax+mw; bx=bx-mw;}
					else {bx=ax;}					
				}
				
				var path = d3.svg.line()
				.x(function(t) {return t[0];})
				.y(function(t) {return t[1];})
				.interpolate("linear");
		
				return path([[ax,ay],[bx,by]]);
			}
			
			//labels positions
			var labels = d3.select("#mtm-treemap").select(".mtm-labels")
			labels.selectAll("path")
				.transition().duration(1500)
				.attr("d",function(d) {return line(d); })			

if(verbose){console.timeEnd("zoomMap");}
		}
		
		//update table
		if(config.table.display) {
if(verbose){console.time("zoomTable");}
			//clear %
			d3.select(".mtm-table").select(".mtm-labels")
				.selectAll("tr").selectAll(".percent")
				.text("-");
			
			//set % of the subtree
			//var hundread = n.data.hits; //100%	
			d3.select(".mtm-table").select(".mtm-labels").selectAll("tr") //all lines
				.data(getSubtree(n,[]),
					function(d){return "t"+d.id+"-"+d.data.sample;}) //lines of subtree
				.selectAll(".percent") //column of %
				.text( //new text
					function(d){return (d.value*100/n.value).toFixed(2)+"%";}
				);

			//map call updateLabel() else it is needed
			if(!config.treemap.display) {updateLabel();} 
if(verbose){console.timeEnd("zoomTable");}
		}
		
		//update current node
		node = n;
if(verbose){console.timeEnd("zoom");}
	}
	
	function getSubtree(n,ns) {
		//get a list of all nodes in subtree of n, n included
		if(n.children) {
			n.children.forEach(function(c){
				ns = getSubtree(c,ns); 
			}); 
		}
		//exclude root because id not exist
		if(n!=root) { ns.push(n); }
		return ns;
	}
	
	//accessors for treemap size parameter
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
		d3.select("body").append("a")
			.attr("download",name)
			.attr("href",url)
			.node()
			.click();
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
			d3.select("#mtm-fieldhead").text("Object property");
			d3.select("[name=mtm-tid]").attr("value","id");
			d3.select("[name=mtm-tname]").attr("value","name");
			d3.select("[name=mtm-hits]").attr("value","data.assigned");
			d3.select("#mtm-headrow").style("display","none");
		}
		else if(e.value=="tab"){
			d3.select("#mtm-fieldhead").text("Column index");
			d3.select("[name=mtm-tid]").attr("value","1");
			d3.select("[name=mtm-tname]").attr("value","2");
			d3.select("[name=mtm-hits]").attr("value","3");
			d3.select("#mtm-headrow").style("display","table-row");
		}
	}
	
	function convert() {
		var format = d3.select("[name=mtm-format]:checked").node().value;
		var file=d3.select("#input").node().files[0];
		
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
			});
		
			if(format=="json") {
				//get property
				var id=d3.select("[name=mtm-tid]").node().value.split(".");
				var name=d3.select("[name=mtm-tname]").node().value.split(".");
				var hits=d3.select("[name=mtm-hits]").node().value.split(".");
	
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
				var id=+d3.select("[name=mtm-tid]").node().value-1;
				var name=+d3.select("[name=mtm-tname]").node().value-1;
				var hits=+d3.select("[name=mtm-hits]").node().value-1;
				var header=d3.select("[name=mtm-head]").property("checked");
	
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
				
				});
			}
		});
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
