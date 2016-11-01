var grouper = function() {
    var nodes = [];
    var width;
    var height;
    var c = circler();
    var add_node = function(name) {
        var new_node = {name: name, x : width / 2, y: height / 2};
        nodes.push(new_node);
        var number_of_groups = Math.floor(nodes.length / 5 + 1);
        var g = c.groups(number_of_groups).groups();
        assign_groups(g);
    };

   function assign_groups(groups) {
        for(var i = 0; i < nodes.length; i++) {
            nodes[i]["group"] = groups[i % groups.length];
        }
    }

    function dimensions(w, h) {
        width = w;
        height = h;
        c.dimensions(w, h);
        return this;
    }
    return {nodes: nodes,
            add_node: add_node,
            dimensions: dimensions};
}

function circler() {
    var g;
    var width;
    var height;
    var dimensions = function(w, h) {
        width = w;
        height = h;
        return this;
    };
    var groups = function(num) {
        if(arguments.length == 0) {
            return g;
        }
        g = [];
        var angle_part = 2 * Math.PI / num;
        for(var i = 0; i < num; i++) {
            g.push({x: Math.round(Math.sin(angle_part * i) * width / 2 + width / 2),
                    y: Math.round(Math.cos(angle_part * i)) * height / 2 + height / 2});
        }
        return this;
    };
    return {dimensions: dimensions,
            groups: groups};
}
var vis = function(root) {
    var svg = root.select('svg');
    var g = grouper();
    var alpha_target = 0.9;
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var tick = function() {
        root
            .selectAll(".node")
            .attr("transform", function(d) { return "translate(" + d["x"] + "," + d["y"] + ")"; });
    };

    var sim = d3.forceSimulation(g.nodes)
            .force("charge", d3.forceManyBody().strength(-70))
            .force("x", d3.forceX(function(d) { return d["group"]["x"];}))
            .force("y", d3.forceY(function(d) { return d["group"]["y"];}))
            .on("tick", tick);

    var render = function () {
        g.dimensions(get_svg(root, "width"), get_svg(root, "height"));
        var nodes_select = svg.selectAll(".node")
                .data(g.nodes);

        var nodes_enter = nodes_select
                .enter()
                .append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + d["x"] + "," + d["y"] + ")"; })
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

        sim
            .nodes(g.nodes)
            .alphaTarget(alpha_target)
            .restart();
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

    root.select(".name_input")
        .on("keypress", function(code, text) {
            if(code == 13 || d3.event.keyCode == 13) {
                g.add_node(text || this.value);
                render();
            }
        });

    window.addEventListener("resize", render);
    window.addEventListener("load", render);
    return {};
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

var root = create_component("#main");
vis(root);

QUnit.test( "hello test", function( assert ) {
    var root = d3.select('#main');
    assert.ok(!isNaN(get_svg(root, "width")));
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

QUnit.test("Grouper", function(assert) {
    var g = grouper().dimensions(10,10);
    g.add_node("test");
    assert.ok(g.nodes.length > 0, "Add node works");
    assert.deepEqual(g.nodes[0]["group"], {x: 5, y: 10}, "A group is assigned");
    for(var i = 0; i < 5; i++) {
        g.add_node("test");
    }
});

QUnit.test("Circler", function(assert) {
    var c = circler()
            .dimensions(10,10)
            .groups(2);
    assert.deepEqual(c.groups(), [{x: 5, y: 10},{x: 5, y: 0}], "Two groups work OK");
    c.groups(1);
    assert.equal(c.groups().length, 1, "Groups can shrink");
});
