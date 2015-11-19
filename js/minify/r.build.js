({
    baseUrl: "../",
	paths: {
		requireLib: 'require',
		d3: "d3.min",
		d3tip: "d3.tip.v0.6.3",
		d3transform: "d3-transform"
	},
	include: ["requireLib","d3","d3tip","d3transform"],
    name: "mtm",
    out: "../../mtm.min.js"
})