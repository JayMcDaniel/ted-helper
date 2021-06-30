//get JSONs from array and adds them to master TED array of objects my year
var master_TEDs_arr = []; //main global var


//sorts master_TEDs_arr by date - called after getJSONs
function sortByDate(master_TEDs_arr) {

    var months = ["January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"
    ];

    master_TEDs_arr.forEach(ted => {
        var month_index = months.indexOf(ted.ted_date.match(/[a-z]+/i)[0]).toString();
        month_index = month_index.length === 2 ? month_index : "0" + month_index;

        var year = ted.ted_date.match(/\b[0-9]+$/i)[0].toString();
        var day = ted.ted_date.match(/\b[0-9]+/i)[0].toString();

        ted.date_number = Number((year + month_index + day));

    })

    master_TEDs_arr.sort(function (a, b) {
        return b.date_number - a.date_number;
    });

}


function getJSONs(json_arr) {
    json_arr.forEach(function (filename) {
        $.get("json/" + filename, function (data) {
            master_TEDs_arr = master_TEDs_arr.concat(data) //newest comes first;
            master_TEDs_arr = removeDuplicates(master_TEDs_arr, TED_obj => TED_obj.ted_title);
        })
    });


    setTimeout(function () {
        sortByDate(master_TEDs_arr);
    }, 1000);

}



//get object size add on
Object.size = function (obj) {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

//remove duplicate objects from array
function removeDuplicates(obj_arr, key) {
    return [...new Map(obj_arr.map(item => [key(item), item])).values()]
};




//function returns commonly used regexes
function getTextRegex(o) {

    var text_for_re = o.text_for_re.replace(/\+|\*/g, "") || "";

    var text_for_string = o.text_for_string || "";
    var type = o.type;
    var replacement_string = o.replacement_string || "";

    var match = {};
    var regex;

    if (type == undefined) {
        match.string = text_for_string;
        match.re = new RegExp(text_for_re, "i");

        return match;
    }

    if (type === "title") {
        regex = /\,|\d|\.|_|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)/g;
    }

    if (type === "body text") {
        regex = /\(|\)|\+|\-|−|\d|_|\$|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)/g;
    }

    if (type === "helper") { //used to enter text in input from helper click
        regex = /\,\d+|\d|_|\$|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)/g;
    }


    if (type === "program office") {
        regex = /\(|\)|_/g;
    }

    if (type === "list") {
        regex = /\n/g;
    }

    match.string = $.trim(text_for_string.replace(regex, replacement_string));

    match.re = new RegExp($.trim(text_for_re.replace(regex, replacement_string)), "i");



    return match;

}



//copy text to clipboard
function bindCopyToClipboard() {

    $("i.fa-copy").click(function () {

        var input = $(this).prev();
        var input_text = input.val();
        input.select();
        document.execCommand("copy");
        input.val("Copied to clipboard!").css("color", "#b33913");

        setTimeout(function () {
            input.val(input_text).css("color", "#000").trigger("input");
        }, 700);
    });

}


//bind helper clicks
function bindHelperClick() {
    $(".add_suggestion_button").unbind().click(function (ev) {

        ev.preventDefault();

        var this_p = $(this).parent();

        var input_id = this_p.attr("data-rel");

        if (input_id) {
            var input_area = $("#" + input_id);
            var new_text = this_p.attr("data-add") === "true" ? input_area.val() + "\n" + this_p.text() : this_p.text();
            new_text = new_text.replace("[+]", "");

            new_text = getTextRegex({
                text_for_re: new_text,
                text_for_string: new_text,
                type: "helper",
                replacement_string: "_"
            }).string;

            input_area.val(new_text).trigger("input");


            $([document.documentElement, document.body]).animate({
                scrollTop: input_area.offset().top - 60
            }, 500);
            input_area.focus();

        }

    });
}


//bind chart image hover - shows image larger in a popup
function bindChartImageHover() {

    $(".helper_div img").unbind().hover(function () {

        $("#popup_image").attr("src", $(this).attr("src"));
        $("#popup_div").show();


    }, function () {
        $("#popup_div").hide();
    });

    $(".helper_div img").tooltip();
}


//updates systemURL text - called when TED title is changed
function updateSystemURL(text) {
    text = text.replace(/[ \'\"\.\(\)%;\,\s*]/g, "-").replace(/\-+/g, "-").toLowerCase();
    $("#input_system_url").val(text);
}


//helper function - called below with updateSuggested...
function getSuggestions(o) {

    var suggestions = [];

    //first look at PO input
    if (o.text.length > 0) {

        master_TEDs_arr.forEach(function (TED_obj) {
            var match = getTextRegex({
                text_for_re: o.text,
                text_for_string: TED_obj[o.match_key],
                type: o.regex_type
            });



            if (match.re.test(match.string)) {
                if (o.split_by) {
                    suggestions = suggestions.concat(TED_obj[[o.requested_key]].split(o.split_by));
                } else {

                    if (o.requested_key === "this") {
                        suggestions.push(TED_obj);
                    } else {
                        suggestions.push(TED_obj[o.requested_key]);
                    }

                }
            }


        });
    }

    return suggestions;

}





//filters suggestion array and inserts on page
function insertSuggestions(o) {

    let unique_suggestions = [...new Set(o.suggestions)].filter(function (suggestion) {
        if (o.remove_reg_ex) {
            return !o.remove_reg_ex.test(suggestion);
        } else if (o.match_reg_ex) {
            return o.match_reg_ex.test(suggestion);
        } else {
            return suggestion;
        }
    }); //use only unique and filter out non offices


    if (unique_suggestions.length < 1) {
        $("#" + o.div_id).parent().hide();

    } else {
        $("#" + o.div_id).empty();

        $("#" + o.div_id).parent().show();

        unique_suggestions.forEach(suggestion => {
            if (suggestion != "") {
                $("#" + o.div_id).append($("<p data-rel='" + o.data_rel + "' data-add='" + o.data_add + "'><a href='#' class='add_suggestion_button' title='Add text'>[+]</a>" + suggestion + "</p>"));
            }
        });
    }


    bindHelperClick();
}




//receives an array of options to be passed to getSuggestions and and returns array compiled from getSuggestions()
function compileSuggestions(arr) {

    var suggestions = [];

    arr.forEach(function (o, i) {

        if (i === 0) {
            suggestions = getSuggestions(o);

        } else {
            suggestions = suggestions.concat(
                getSuggestions(o)
            );

        }

    });

    return suggestions;
}



//looks for matching TED Titles and adds to ted_title_helper
function updateSimilarTEDs(title_text, program_office_text) {

    var ted_helper_output = $("#ted_title_helper_output");
    ted_helper_output.html("");

    var suggestions = compileSuggestions([{
            text: program_office_text, //first look at PO input
            match_key: "ted_program_name",
            requested_key: "this",
            regex_type: "program office"
        },
        {
            text: title_text, //then look at title input and add to suggestions
            match_key: "ted_title",
            requested_key: "this",
            regex_type: "title"
        }
    ]);


    if (suggestions.length < 1) {
        ted_helper_output.parent().hide();

    } else {
        ted_helper_output.empty();

        ted_helper_output.parent().show();

        var active_searchable_topics = [];
        $(".filter_checkbox_span input:checkbox:checked").each(function (i, checkbox) {
            active_searchable_topics.push($(checkbox).attr("data-rel"));
        })

        suggestions.forEach(function (TED_obj) {

            var searchables = active_searchable_topics.map(function (searchable) {

                if (TED_obj[searchable]) {
                    return TED_obj[searchable].toLowerCase();
                } else {
                    return null;
                }

            }).join(";");


            $("#ted_title_helper_output").append("<div class='row' data-searchables='" + searchables + "'><h3>" + TED_obj.ted_date + "</h3><div class='col-6'><p data-rel='input_ted_title'><a href='#' class='add_suggestion_button' title='Add text'>[+]</a>" + TED_obj.ted_title + "</p></div> <div class='col-6'> <a href='" + TED_obj.ted_url + "' target='_blank'> <img src='images/" + TED_obj.ted_image_name + "' alt='" + TED_obj.ted_table_title + "' title='" + TED_obj.ted_table_title + "' data-toggle='tooltip'/></a></div></div>");

        });

        bindChartImageHover();
        bindHelperClick();

    }



}




//ted_program_helper_output - looks for matching program offices based on ted title and program office entry
function updateSuggestedProgramOffices(title_text, program_office_text) {

    var suggestions = compileSuggestions([{
            text: program_office_text, //first look at PO input
            match_key: "ted_program_name",
            requested_key: "ted_program_name",
            regex_type: "program office"
        },
        {
            text: title_text, //then look at title input and add to suggestions
            match_key: "ted_title",
            requested_key: "ted_program_name",
            regex_type: "title"
        }
    ]);

    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_program_helper_output",
        remove_reg_ex: /chart|\.|\d|html|pdf/i,
        data_rel: "input_ted_program"
    });

}


//Intro Helper updater
function updateSuggestedIntros(title_text, program_office_text) {

    var suggestions = compileSuggestions([{
            text: program_office_text, //first look at PO input
            match_key: "ted_program_name",
            requested_key: "ted_program_name"
        },
        {
            text: title_text,
            match_key: "ted_title",
            requested_key: "ted_program_name",
            regex_type: "title"
        }
    ]);

    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_program_helper_output",
        remove_reg_ex: /chart|\.|\d/i,
        data_rel: "input_ted_program"
    });

}



//ted_office_url_helper_output - looks for matching program offices urls
function updateSuggestedOfficeURLs(program_office_text, url_text) {

    //first look at PO input
    var suggestions = compileSuggestions([{
        text: program_office_text,
        match_key: "ted_program_name",
        requested_key: "ted_program_url",
        regex_type: "program office"
    }, {
        text: url_text,
        match_key: "ted_program_url",
        requested_key: "ted_program_url",
        regex_type: "program office"
    }]);

    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_office_url_helper_output",
        remove_reg_ex: /chart|news|htm/i,
        data_rel: "input_ted_office_url"
    });

}




//looks for related intro text
function updateRelatedIntroText(title_text, program_office_text, intro_text) {


    //look at PO input
    var suggestions = compileSuggestions([{
            text: program_office_text,
            match_key: "ted_program_name",
            requested_key: "ted_intro",
            regex_type: "program office"
        },
        {
            text: title_text, //look at title input
            match_key: "ted_title",
            requested_key: "ted_intro",
            regex_type: "title"
        }, {
            text: intro_text,
            match_key: "ted_intro",
            requested_key: "ted_intro",
            regex_type: "title"
        }
    ]);


    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_intro_helper_output",
        remove_reg_ex: /htm/i,
        data_rel: "input_ted_intro"
    });

}






//looks for related middle (Closing) text
function updateRelatedMiddleText(title_text, program_office_text, middle_text) {

    //look at PO input
    var suggestions = compileSuggestions([{
            text: program_office_text,
            match_key: "ted_program_name",
            requested_key: "ted_body",
            regex_type: "program office"
        }, {
            text: title_text,
            match_key: "ted_title",
            requested_key: "ted_body",
            regex_type: "title"
        },
        {
            text: middle_text,
            match_key: "ted_body",
            requested_key: "ted_body",
            regex_type: "body text"
        }
    ]);


    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_middle_helper_output",
        remove_reg_ex: /htm/i,
        data_rel: "input_ted_middle"
    });

}


//looks for related outro (Closing) text
function updateRelatedOutroText(title_text, program_office_text, outro_text) {

    //look at PO input
    var suggestions = compileSuggestions([{
            text: program_office_text,
            match_key: "ted_program_name",
            requested_key: "ted_outro",
            regex_type: "program office"
        }, {
            text: title_text,
            match_key: "ted_title",
            requested_key: "ted_outro",
            regex_type: "title"
        },
        {
            text: outro_text,
            match_key: "ted_outro",
            requested_key: "ted_outro",
            regex_type: "title"
        }
    ])



    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_outro_helper_output",
        remove_reg_ex: /htm/i,
        data_rel: "input_ted_outro"
    });

}


//called by updateRelatedTopics and updateRelatedChartsURL
function getRelated(title_text, program_text, intro_text, outro_text, requested_key) {

    return compileSuggestions([{
            text: title_text,
            match_key: "ted_title",
            requested_key: requested_key,
            regex_type: "title",
            split_by: "; "
        }, {
            text: program_text,
            match_key: "ted_program_name",
            requested_key: requested_key,
            regex_type: "program office",
            split_by: "; "
        }, {
            text: intro_text,
            match_key: "ted_intro",
            requested_key: requested_key,
            regex_type: "body copy",
            split_by: "; "
        }, {
            text: outro_text,
            match_key: "ted_outro",
            requested_key: requested_key,
            regex_type: "body copy",
            split_by: "; "
        }

    ]);
}



//looks for related Topics 
function updateRelatedTopics(title_text, program_text, intro_text, outro_text) {

    //look at title text
    var suggestions = getRelated(title_text, program_text, intro_text, outro_text, "ted_related_subjects");

    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_related_topics_helper_output",
        remove_reg_ex: /htm|chart/i,
        data_rel: "input_ted_related_topics",
        data_add: true
    });
}




//looks for urls of related charts package
function updateRelatedChartsURL(title_text, program_text, intro_text, outro_text) {

    //look at title text
    var suggestions = getRelated(title_text, program_text, intro_text, outro_text, "ted_related_charts_url");

    //insert on page
    insertSuggestions({
        suggestions: suggestions,
        div_id: "ted_related_charts_url_helper_output",
        match_reg_ex: /charts/,
        data_rel: "input_ted_related_charts_url",
        data_add: true
    });

}





/*delay function so something is triggered only after the user stops typing for a bit */
let delay = (function () {
    let timer = 0;
    return function (callback, ms) {
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
    };
})();




//Builds body copy HTML - fired when build_html_button is clicked
function buildBodyHTML() {

    var body_text = $("#input_ted_intro").val() + "\n" +
        $("#input_ted_middle").val() + "\n" +
        $("#input_ted_outro").val();


    body_text = body_text.split("\n").map(function (p) {
            if (p != "") {
                return `<p>${p}</p>\n`;
            } else {
                return "";
            }

        }).join("")
        //replace common html characters
        .replace(/-(\d+)/g, "&minus;$1")
        .replace(/“|”/g, '"')


    var NR_url = $("#input_ted_related_NR_url").val();

    if (NR_url != "") {
        body_text = body_text.replace(/"(.+)\."/i, `"<a href="${NR_url}">$1</a>."`);
    }


    var program_name = $("#input_ted_program").val();

    if (program_name != "") {
        var program_url = $("#input_ted_office_url").val();
        body_text = body_text.replace(program_name, `<a href="${program_url}">${program_name}</a>`);
    }

    var charts_url = $("#input_ted_related_charts_url").val();

    if (charts_url != "") {
        body_text = body_text.replace(/(chart[\w\s]+)\./i, `<a href="${charts_url}">$1</a>.`);
    }


    $("#ted_body_html").val(body_text);
}



//Similar TEDs Filter bar
function filterSimilarTEDs() {

    var filter_val = $("#similar_teds_search").val();

    if (filter_val === "") {
        $("#ted_title_helper_output .row").show();
    } else {
        filter_val = filter_val.toLowerCase();
        $("#ted_title_helper_output .row").hide();
        $("#ted_title_helper_output .row[data-searchables*='" + filter_val + "']").show();
    }

}

///DOC READY ///

$(document).ready(function () {

    //get and format jsons on load
    getJSONs(["ted_2021.json", "ted_2020.json", "ted_2019.json", "ted_2018.json", "ted_2017.json"]);

    var delay_ms = 400;

    //TED title input
    $("#input_ted_title").on("input focus", function () {
        let self = $(this);

        delay(function () {
            updateSystemURL(self.val());
            updateSimilarTEDs($("#input_ted_title").val(), $("#input_ted_program").val());
        }, delay_ms);
    });

    //Program office focus and input
    $("#input_ted_program").on("input focus", function () {

        delay(function () {
            updateSuggestedProgramOffices($("#input_ted_title").val(), $("#input_ted_program").val());
            updateSimilarTEDs($("#input_ted_title").val(), $("#input_ted_program").val());

        }, delay_ms);

    });

    //Program office urls focus and input
    $("#input_ted_office_url").on("input focus", function () {
        let self = $(this);

        delay(function () {
            updateSuggestedOfficeURLs($("#input_ted_program").val(), self.val());
        }, delay_ms);
    });

    //intro text input
    $("#input_ted_intro").on("input focus", function () {
        let self = $(this);

        delay(function () {
            updateRelatedIntroText($("#input_ted_title").val(), $("#input_ted_program").val(), self.val());
        }, delay_ms);
    });


    //middle (body) text input

    $("#input_ted_middle").on("input focus", function () {
        let self = $(this);

        delay(function () {
            updateRelatedMiddleText($("#input_ted_title").val(), $("#input_ted_program").val(), self.val());
        }, delay_ms);
    });


    //outro (Conclusion) text input
    $("#input_ted_outro").on("input focus", function () {
        let self = $(this);

        delay(function () {
            updateRelatedOutroText($("#input_ted_title").val(), $("#input_ted_program").val(), self.val());
        }, delay_ms);
    });

    //related charts urls
    $("#input_ted_related_charts_url").on("input focus", function () {
        let self = $(this);

        delay(function () {
            updateRelatedChartsURL($("#input_ted_title").val(), $("#input_ted_program").val(), $("#input_ted_intro").val(), $("#input_ted_outro").val());
        }, delay_ms);
    });

    //related topics
    $("#input_ted_related_topics").on("input focus", function () {
        let self = $(this);

        delay(function () {
            updateRelatedTopics($("#input_ted_title").val(), $("#input_ted_program").val(), $("#input_ted_intro").val(), $("#input_ted_outro").val());
        }, delay_ms);
    });


    //bind clipboard clicks
    bindCopyToClipboard();


    //bind similar TEDs filter bar
    $("#similar_teds_search").on("input", function () {

        delay(function () {
            filterSimilarTEDs();
        }, delay_ms);
    });


    //change filter checkboxes - reloads simular teds with appropriate search metadata
    $(".filter_checkbox_span input:checkbox").click(function () {
        updateSimilarTEDs($("#input_ted_title").val(), $("#input_ted_program").val());
        filterSimilarTEDs();

    });


    //bind hide/show buttons
    $(".hide_button").click(function (ev) {
        ev.preventDefault();

        var hide_elem = $(this).attr("data-rel-class") ? $("." + $(this).attr("data-rel-class")) : $(this).parent().next();

        if ($(this).text() === "Hide") {
            hide_elem.hide();
            $(this).text("Show");
        } else {
            hide_elem.show();
            $(this).text("Hide");
        }
    })

    //build HTML button clicked
    $("#build_html_button").click(function () {
        buildBodyHTML();
    });

});