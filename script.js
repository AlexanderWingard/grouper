var vis = function(id) {
    d3.select("#name_input")
        .on("keypress", function(d) {
            if(d3.event.keyCode == 13) {
                add_node("dummy");
            }
        });
    var cx = 0;
    var cy = 0;
    var nodes = [];
    var alpha_target = 0.9;
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var tick = function() {
        d3.select(id)
            .selectAll(".dot")
            .data(nodes)
            .attr("cx", function(d) { return d["x"]; })
            .attr("cy", function(d) { return d["y"]; });
    };

    var sim = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-70))
            .force("x", d3.forceX(function(d) { return d["tx"];}))
            .force("y", d3.forceY(function(d) { return d["ty"];}))
            .on("tick", tick);

    function add_node(name) {
        var new_node = {name: name, x: cx, y:cy, tx: 500, ty: 500};
        nodes.push(new_node);
        assign_groups();
        sim.nodes(nodes);
        render();
        return new_node;
    }
    function assign_groups() {
        var groups = [{x: 500, y: 500}, {x: 100, y:100}];
        for(var i = 0; i < nodes.length; i++) {
            var g = Math.floor(Math.random() *  groups.length);
            nodes[i]["tx"] = groups[g]["x"];
            nodes[i]["ty"] = groups[g]["y"];
        }
    }

    var render = function () {
        var svg = d3.select(id);
        cx = get_svg(id, "width") / 2;
        cy = get_svg(id, "height") / 2;
        var circles = svg.selectAll(".dot")
                .data(nodes);

        var circles_enter = circles
                .enter()
                .append("circle")
                .attr("class", "dot")
                .attr("r", 20)
                .style("fill", function(d, i) { return color(i); })
                .call(d3.drag()
                      .on("start", dragstarted)
                      .on("drag", dragged)
                      .on("end", dragended));

        var circles_update = circles
                .merge(circles_enter);

        tick();
        sim.alphaTarget(alpha_target).restart();
   };

    function dragstarted(d) {
        if (!d3.event.active) sim.alphaTarget(alpha_target).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    window.addEventListener("resize", render);
    window.addEventListener("load", render);
    return {nodes: nodes,
            add_node: add_node};
};

function get_svg(id, style) {
    return parseInt(d3.select(id).style(style));
}


QUnit.test( "hello test", function( assert ) {
    assert.ok(!isNaN(get_svg("#main", "width")));
});

QUnit.test("Add node", function(assert) {
    var new_node = vis('#main').add_node("test");
    assert.ok(new_node.hasOwnProperty("x"));
});

QUnit.test("Data-binding", function(assert) {
    d3.select("#qunit-fixture")
        .append("svg")
        .attr("id", "temp")
        .style("width", "100%")
        .style("height", "100%");

    var nodes = ["1", "2", "3"];
    var myvis = vis("#temp");
    nodes.forEach(function(d) {
         myvis.add_node(d);
     });

    var data_in_svg = d3
        .select("#temp")
        .selectAll(".dot")
        .data();

    var names_in_svg = data_in_svg
        .map(function(d) {
            return d.name;
        });

    assert.deepEqual(names_in_svg, nodes);
});
