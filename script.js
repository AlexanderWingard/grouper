var default_assigner = function(nodes, groups) {
    var min_group_size = Math.floor(nodes.length / groups.length);
    for(var i = 0; i < nodes.length; i++) {
        if(!("group" in nodes[i])) {
            nodes[i]["group"] = groups[Math.trunc(d3.randomUniform(groups.length)())];
        } else {
            var g = groups.find(function(d) { return d["n"] == nodes[i]["group"]["n"];});
            if(g != undefined) {
                nodes[i]["group"] = g;
            } else {
                nodes[i]["group"] = groups[Math.trunc(d3.randomUniform(groups.length)())];
            }
        }
    }
    var nested = d3.nest()
            .key(function(d) {
                return d["group"]["n"];
            })
            .rollup(function(d) { return d.length;})
            .map(nodes);
    for(var i = 0; i < groups.length; i++) {
        if(!nested.has(groups[i]["n"])) {
            nested.set(groups[i]["n"], 0);
        }
    }
    var too_small = [];
    var too_large = [];
    nested.each(function(v, k, m) {
        if(v < min_group_size) {
            too_small.push(k);
        } else if (v > (min_group_size + 1)) {
            too_large.push(k);
        }
    });
    if(too_small.length > 0) {
        var move = nodes[Math.trunc(d3.randomUniform(nodes.length)())];
        var g = groups.find(function(d) { return d["n"] == too_small[0]; });
        move["group"] = g;
        default_assigner(nodes, groups);
    } else if(too_large.length > 0) {
        var move = nodes.find(function(d) { return d["group"]["n"] == too_large[0];});
        var g = groups.filter(function(d) { return d["n"] != too_large[0];});
        move["group"] = g[Math.trunc(d3.randomUniform(g.length)())];
        default_assigner(nodes, groups);
    }
};

var grouper = function() {
    var nodes = [];
    var width;
    var height;
    var c = circler();
    var a = default_assigner;
    var add_node = function(name) {
        var new_node = {name: name, x : width / 2, y: height / 2};
        nodes.push(new_node);
        render();
   };

    var remove_last_node = function() {
        nodes.splice(-1, 1);
        render();
    };

    var render = function() {
        var number_of_groups = Math.ceil(nodes.length / 4);
        var g = c.groups(number_of_groups).groups();
        a(nodes, g);
    };

    var assigner = function(fun) {
        if(fun == undefined) {
            return a;
        }
        a = fun;
        return this;
    };

    function dimensions(w, h) {
        width = w;
        height = h;
        c.dimensions(w, h);
        render();
        return this;
    }
    return {nodes: nodes,
            add_node: add_node,
            remove_last_node: remove_last_node,
            dimensions: dimensions,
            shrink: c.shrink,
            groups: c.groups,
            assigner: assigner};
};

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
            g.push({n: i,
                    x: Math.round(Math.sin(angle_part * i) * radius / 2 + width / 2),
                    y: Math.round(Math.cos(angle_part * i) * radius / 2 + height / 2)});
        }
        return g;
    };
    return {dimensions: dimensions,
            groups: groups,
            shrink: shrink};
}
var lister = function() {
    var group_name = function(key) {
        if(key == "0") return "Transportation";
        if(key == "1") return "IoT";
        if(key == "2") return "Housing";
        if(key == "3") return "Education";
        if(key == "4") return "Migration";
        return key;
    };
    var render = function(root, nodes) {
        var data = list(nodes);
        var list_group = root.selectAll(".list_group")
                .data(data);
        var list_group_enter = list_group
                .enter()
                .append("div")
                .attr("class", "list_group");
        var list_group_exit = list_group
                .exit()
                .remove();
        var list_group_update = list_group
                .merge(list_group_enter)
                .text(function(d) { return group_name(d["key"]);});
        var list_item = list_group_update
                .selectAll(".list_item")
                .data(function(d) { return d["values"]; });
        var list_item_enter = list_item
                .enter()
                .append("div")
                .attr("class", "list_item");
        var list_item_exit = list_item
                .exit()
                .remove();
        var list_item_update = list_item
                .merge(list_item_enter)
                .text(function(d) { return d["name"]; });
    };
    var list = function(nodes) {
        var nested = d3.nest()
                .key(function(d) { return d["group"]["n"]; })
            .entries(nodes);
        return nested;
    };
    return {list: list,
            render: render};
};
var vis = function(root) {
    var svg = root.select('svg');
    var g = grouper();
    var l = lister();
    var alpha_target = 0.9;
    var color = d3.scaleOrdinal(["#009999", "#330066", "#808080", "#003333", "#99FFFF"]);

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
        var width = get_svg(root, "width");
        var height = get_svg(root, "height");
        g.dimensions(width, height);
        var nodes_select = svg.selectAll(".node")
                .data(g.nodes);

        var nodes_enter = nodes_select
                .enter()
                .append("g")
                .attr("class", "node")
                .attr("transform", function(d) {
                    return "translate(" + (width / 2) + "," + (height / 2) + ")";
                })
                .call(d3.drag()
                      .on("start", dragstarted)
                      .on("drag", dragged)
                      .on("end", dragended));

        var nodes_exit = nodes_select.exit().remove();
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
                l.render(modal, g.nodes);
                modal.style("display", "block");
            } else {
                modal.style("display", "none");
            }
        });
    root.select(".undo")
        .on("click", function() {
            g.remove_last_node();
            render();
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
    root.append("a")
        .attr("class", "undo")
        .text("undo");
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


QUnit.test("Nodes are grouped", function(assert) {
    // add 5 nodes
    var g = grouper().dimensions(10,10);
    g.assigner(function() { return "dummy";});
    for(var i = 0; i < 5; i++) {
        g.add_node("test");
    }

    // get list of groups
    var groups = g.nodes.reduce(function(acc, d) {
        var group = JSON.stringify(d["group"]);
        acc[group] = undefined;
        return acc;
    }, {});

    assert.equal(Object.keys(groups).length, 1, "All nodes assigned to dummy group");
    assert.equal(g.groups().length, 2, "There are two groups");
});

QUnit.test("Circler", function(assert) {
    var c = circler()
            .dimensions(10,10)
            .groups(3);
    assert.deepEqual(c.groups(), [{n: 0, x: 5 ,y: 10},{n: 1, x: 9, y: 3}, {n: 2, x: 1, y: 2}], "Three groups work OK");
    c.groups(1);
    assert.deepEqual(c.groups(), [{n: 0, x: 5, y: 10}], "Groups can shrink");
    assert.deepEqual(c.shrink(0.5).groups(), [{n: 0, x: 5, y: 8}], "Radius can shrink");
});

QUnit.test("Lister", function(assert) {
    var l = lister();
    var test_nodes = [{name: "a", group: {n: 1}}, {name: "a", group: {n: 1}}, {name: "b", group: {n: 2}}];
    assert.equal(l.list(test_nodes).length, 2);
    assert.equal(l.list(test_nodes)[0]["key"], "1");
});

