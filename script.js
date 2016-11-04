var grouper = function() {
    var nodes = [];
    var width;
    var height;
    var c = circler();
    var add_node = function(name) {
        var new_node = {name: name, x : width / 2, y: height / 2};
        nodes.push(new_node);
        render();
   };

    var render = function() {
        var number_of_groups = Math.floor(nodes.length / 5 + 1);
        var g = c.groups(number_of_groups).groups();
        assign_groups(g);
    }
   function assign_groups(groups) {
        for(var i = 0; i < nodes.length; i++) {
            nodes[i]["group"] = groups[i % groups.length];
        }
    }

    function dimensions(w, h) {
        width = w;
        height = h;
        c.dimensions(w, h);
        render();
        return this;
    }
    return {nodes: nodes,
            add_node: add_node,
            dimensions: dimensions,
            shrink: c.shrink};
}

function circler() {
    var num = 0;
    var width;
    var height;
    var shrink_factor = 1;
    var dimensions = function(w, h) {
        width = w;
        height = h;
        return this;
    };
    var shrink = function(factor) {
        shrink_factor = factor;
        return this;
    };
    var groups = function(n) {
        if(n != undefined) {
            num = n;
            return this;
        }
        var radius = Math.min(width, height) * shrink_factor;
        g = [];
        var angle_part = 2 * Math.PI / num;
        for(var i = 0; i < num; i++) {
            g.push({x: Math.round(Math.sin(angle_part * i) * radius / 2 + width / 2),
                    y: Math.round(Math.cos(angle_part * i) * radius / 2 + height / 2)});
        }
        return g;
    };
    return {dimensions: dimensions,
            groups: groups,
            shrink: shrink};
}
var lister = function() {
    var list = function(nodes) {
        var nested = d3.nest()
            .key(function(d) { return d["group"]; })
            .entries(nodes);
        return nested;
    };
    return {list: list};
};
var vis = function(root) {
    var svg = root.select('svg');
    var g = grouper();
    var l = lister();
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

    root.select(".footer")
        .on("click", function() {
            var modal = d3.select(".modal");
            if(modal.style("display") == "none") {
                modal.text(JSON.stringify(l.list(g.nodes)));
                modal.style("display", "block");
            } else {
                modal.style("display", "none");
            }
        });

    window.addEventListener("resize", render);
    window.addEventListener("load", render);
    return {shrink: g.shrink};
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
    root.append("div")
        .attr("class", "modal");
     root.append("a")
        .attr("class", "footer")
        .text("list");
   root
        .append("svg")
        .attr("id", id)
        .style("width", "100%")
        .style("height", "100%");

    return root;
};

var root = create_component("#main");
vis(root).shrink(0.7);

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
});

QUnit.test("Nodes are grouped", function(assert) {
    // add 5 nodes
    var g = grouper().dimensions(10,10);
    for(var i = 0; i < 5; i++) {
        g.add_node("test");
    }

    // get list of groups
    var groups = g.nodes.reduce(function(acc, d) {
        var xy = d["group"];
        var key = xy.x + ',' + xy.y;
        acc[key] = undefined;
        return acc;
    }, {});

    assert.equal(Object.keys(groups).length, 2);
});

QUnit.test("Circler", function(assert) {
    var c = circler()
            .dimensions(10,10)
            .groups(3);
    assert.deepEqual(c.groups(), [{x: 5 ,y: 10},{x: 9, y: 3}, {x: 1, y: 2}], "Two groups work OK");
    c.groups(1);
    assert.deepEqual(c.groups(), [{x: 5, y: 10}], "Groups can shrink");
    assert.deepEqual(c.shrink(0.5).groups(), [{x: 5, y: 8}], "Radius can shrink");
});

QUnit.test("Lister", function(assert) {
    var l = lister();
    var test_nodes = [{name: "a", group: "a"}, {name: "a", group: "a"}, {name: "b", group: "b"}];
    assert.equal(l.list(test_nodes).length, 2);
});
