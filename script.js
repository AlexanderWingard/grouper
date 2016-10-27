var grouper = function() {
    var nodes = [];
    var add_node = function(name) {
        var new_node = {name: name};
        nodes.push(new_node);
    };
    return {nodes: nodes,
            add_node: add_node};
}
var vis = function(root) {
    root.select(".name_input")
        .on("keypress", function(code, text) {
            if(code == 13 || d3.event.keyCode == 13) {
                add_node(text || this.value);
            }
        });
    var cx = 0;
    var cy = 0;
    var nodes = [];
    var alpha_target = 0.9;
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var tick = function() {
        root
            .selectAll(".node")
            .data(nodes)
            .attr("transform", function(d) { return "translate(" + d["x"] + "," + d["y"] + ")"; });
    };

    var sim = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-70))
            .force("x", d3.forceX(function(d) { return d["tx"];}))
            .force("y", d3.forceY(function(d) { return d["ty"];}))
            .on("tick", tick);

    var add_node = function(name) {
        var new_node = {name: name, x: cx, y:cy, tx: 500, ty: 500};
        nodes.push(new_node);
        assign_groups();
        sim.nodes(nodes);
        render();
        return new_node;
    };

    function assign_groups() {
        var groups = [{x: 500, y: 500}, {x: 100, y:100}];
        for(var i = 0; i < nodes.length; i++) {
            var g = Math.floor(Math.random() *  groups.length);
            nodes[i]["tx"] = groups[g]["x"];
            nodes[i]["ty"] = groups[g]["y"];
        }
    }

    var render = function () {
        var svg = root.select('svg');
        cx = get_svg(root, "width") / 2;
        cy = get_svg(root, "height") / 2;
        var nodes_select = svg.selectAll(".node")
                .data(nodes);

        var nodes_enter = nodes_select
                .enter()
                .append("g")
                .attr("class", "node")
                .call(d3.drag()
                      .on("start", dragstarted)
                      .on("drag", dragged)
                      .on("end", dragended));

        var radius = 20;
        var circles_enter = nodes_enter
                .append("circle")
                .attr("r", radius)
                .style("fill", function(d, i) { return color(i); });
        var label_enter = nodes_enter
                .append("text")
                .text(function(d) { return d["name"]; })
                .style("font-size", function(d) {
                    return Math.min(2 * radius, (2 * radius - 8) / this.getComputedTextLength() * 16) + "px";
                })
                .attr("dy", ".35em");

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

function get_svg(root, style) {
    return parseInt(root.select('svg').style(style));
}

function create_component(parent, id) {
    var root = d3
        .select(parent)
        .append('div');
    root
        .append("input")
        .attr('class', 'name_input')
        .attr("type", "text");
    root
        .append("svg")
        .attr("id", id)
        .style("width", "100%")
        .style("height", "100%");

    return root;
};

QUnit.test( "hello test", function( assert ) {
    var root = d3.select('#main');
    assert.ok(!isNaN(get_svg(root, "width")));
});

QUnit.test("Add node", function(assert) {
    var root = d3.select("#main");
    var new_node = vis(root).add_node("test");
    assert.ok(new_node.hasOwnProperty("x"));
});

QUnit.test("Data-binding", function(assert) {
    var root = create_component("#qunit-fixture", "temp");

    var nodes = ["1", "2", "3"];
    var myvis = vis(root);
    nodes.forEach(function(d) {
        root
            .select('.name_input')
            .on('keypress')(13, d);
     });

    var data_in_svg = d3
        .select("#temp")
        .selectAll(".node")
        .data();

    var names_in_svg = data_in_svg
        .map(function(d) {
            return d.name;
        });

    assert.deepEqual(names_in_svg, nodes);
});

QUnit.test("Grouper exists", function(assert) {
    var g = grouper(); 
    assert.ok(g != undefined, "Grouper does exist");
    g.add_node("test");
    assert.ok(g.nodes.length > 0, "Add node works");
});
