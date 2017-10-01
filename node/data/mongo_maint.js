//update section order

db.getCollection('sections').update({"stage": "dropzone"}, {$set:{"order": NumberInt(0)}},{ multi: true });
db.getCollection('sections').update({"stage": "context"}, {$set:{"order": NumberInt(1)}},{ multi: true });
db.getCollection('sections').update({"stage": "question"}, {$set:{"order": NumberInt(2)}},{ multi: true });
db.getCollection('sections').update({"stage": "brainstorm"}, {$set:{"order": NumberInt(3)}},{ multi: true });
db.getCollection('sections').update({"stage": "evaluation"}, {$set:{"order": NumberInt(4)}},{ multi: true });
db.getCollection('sections').update({"stage": "deepening"}, {$set:{"order": NumberInt(5)}},{ multi: true });
db.getCollection('sections').update({"stage": "structuring"}, {$set:{"order": NumberInt(6)}},{ multi: true });

//sections: insert values for settings.items.promote_to_stage
db.getCollection('sections').update({}, {$set:{"settings.items.promote_to_stage" : []}},{ multi: true });
db.getCollection('sections').update({"stage": "dropzone"}, {$set:{"settings.items.promote_to_stage" : ["brainstorm", "deepening"]}},{ multi: true });


//update titles as uppercase stagename
db.getCollection('sections').find({}).snapshot().forEach(
  function (e) {
    var str = e.stage.toLowerCase();
    e.title = str.substring(0,1).toUpperCase()+str.substring(1);
    db.getCollection('sections').save(e);
  }
)

db.getCollection('sections').update({"stage": "brainstorm"}, {$set:{"settings.items.tagging": true}},{ multi: true });

//introduction of phase
db.getCollection('sections').update({"stage": "dropzone"}, {$set:{"phase": ""}},{ multi: true });
db.getCollection('sections').update({"stage": "context"}, {$set:{"phase": "intro"}},{ multi: true });
db.getCollection('sections').update({"stage": "question"}, {$set:{"phase": "intro"}},{ multi: true });
db.getCollection('sections').update({"stage": "brainstorm"}, {$set:{"phase": "research"}},{ multi: true });
db.getCollection('sections').update({"stage": "evaluation"}, {$set:{"phase": "research"}},{ multi: true });
db.getCollection('sections').update({"stage": "deepening"}, {$set:{"phase": "research"}},{ multi: true });
db.getCollection('sections').update({"stage": "structuring"}, {$set:{"phase": "conclusion"}},{ multi: true });
db.getCollection('sections').update({"stage": "conclusion"}, {$set:{"phase": "conclusion"}},{ multi: true });
db.getCollection('episodes').update({}, {$set: {"phases" : {
        "intro" : {
            "phase" : "intro",
            "class" : "warning",
            "mark"  : "1",
            "title" : "What do we need?"
        },
        "research" : {
            "phase" : "research",
            "class" : "success",
            "mark"  : "2",
            "title" : "What do we know?"
        },
        "conclusion" : {
            "phase" : "conclusion",
            "class" : "primary",
            "mark"  : "3",
            "title" : "What should we do?"
        }
    }}}, {multi: true});
db.getCollection('sections').update({}, {$set:{"settings.items.group_question": ""}},{ multi: true });
db.getCollection('sections').update({}, {$set:{"settings.items.annotate_question": ""}},{ multi: true });
db.getCollection('sections').update({}, {$set:{"settings.items.comment_question": ""}},{ multi: true });
db.getCollection('sections').update({}, {$set:{"settings.items.annotate_title": ""}},{ multi: true });
db.getCollection('sections').update({}, {$set:{"settings.items.comment_title": ""}},{ multi: true });

db.getCollection('sections').update({"stage" : "structuring"}, {$set:{"settings.items.comment_question": "How does this address the identified issues?"}},{ multi: true });
db.getCollection('sections').update({"stage" : "conclusion"}, {$set:{"settings.items.annotate_question": "When do you recommend each option?"}},{ multi: true });
db.getCollection('sections').update({"stage" : "structuring"}, {$set:{"settings.items.comment_title": "How is this issue addressed?"}},{ multi: true });
db.getCollection('sections').update({"stage" : "conclusion"}, {$set:{"settings.items.annotate_title": "When is this option recommended?"}},{ multi: true });

db.getCollection('sections').update({"stage": "dropzone"}, {$set:{"settings.items.type": "raw"}},{ multi: true });
db.getCollection('sections').update({"stage": "context"}, {$set:{"settings.items.type": "fixed"}},{ multi: true });
db.getCollection('sections').update({"stage": "question"}, {$set:{"settings.items.type": "fixed"}},{ multi: true });
db.getCollection('sections').update({"stage": "brainstorm"}, {$set:{"settings.items.type": "single"}},{ multi: true });
db.getCollection('sections').update({"stage": "evaluation"}, {$set:{"settings.items.type": "group"}},{ multi: true });
db.getCollection('sections').update({"stage": "deepening"}, {$set:{"settings.items.type": "single"}},{ multi: true });
db.getCollection('sections').update({"stage": "structuring"}, {$set:{"settings.items.type": "idea"}},{ multi: true });
db.getCollection('sections').update({"stage": "conclusion"}, {$set:{"settings.items.type": "fixed"}},{ multi: true });

db.getCollection('sections').update({"stage": "context"}, {$set:{"settings.discussion": {"promote_to_stage" : ["brainstorm"]}}},{ multi: true });
db.getCollection('sections').update({"stage": "question"}, {$set:{"settings.discussion": {"promote_to_stage" : ["brainstorm"]}}},{ multi: true });
db.getCollection('sections').update({"stage": "brainstorm"}, {$set:{"settings.discussion": {"promote_to_stage" : ["brainstorm"]}}},{ multi: true });
db.getCollection('sections').update({"stage": "evaluation"}, {$set:{"settings.discussion": {"promote_to_stage" : ["brainstorm"]}}},{ multi: true });
db.getCollection('sections').update({"stage": "deepening"}, {$set:{"settings.discussion": {"promote_to_stage" : ["brainstorm"]}}},{ multi: true });
db.getCollection('sections').update({"stage": "structuring"}, {$set:{"settings.discussion": {"promote_to_stage" : ["brainstorm"]}}},{ multi: true });
db.getCollection('sections').update({"stage": "conclusion"}, {$set:{"settings.discussion": {"promote_to_stage" : ["brainstorm"]}}},{ multi: true });

db.getCollection('episodes').update({}, {$unset: {"exports": 1}}, {multi:true});

db.getCollection('episodes').update({}, {$set: {"report_publish": []}}, {multi:true});
db.getCollection('episodes').update({}, {$set: {"report" : [
        {
            "title": "What do we need?",
            "stage": "context",
            "options": {},
            "value": true
        },
        {
            "title": "What do we know?",
            "stage": "evaluation",
            "options": {
                "include_background": {
                    "key" : "include_background",
                    "title" : "include background items",
                    "stage" : "brainstorm",
                    "value" : true
                }
            },
            "value": true
        },
        {
            "title": "What should we do?",
            "stage": "structuring",
            "options": {
                "include_comments": {
                    "key" : "include_comments",
                    "title" : "include comments on identified issues",
                    "stage" : "evaluation",
                    "value" : true
                },
                "include_annotations": {
                    "key" : "include_annotations",
                    "title" : "include individual recommendations",
                    "stage" : "conclusion", 
                    "value" : true                        
                }
            },
            "value": true
        },
        {
            "title": "Recommendations",
            "stage": "conclusion",
            "options": {},
            "value": true
        }
]}}, {multi:true}); 
db.getCollection('sections').update({}, {$unset: {"label": 1}}, {multi:true});    
db.getCollection('sections').update({"stage": "dropzone"}, {$set:{"settings.items.label": "Item"}},{ multi: true });
db.getCollection('sections').update({"stage": "context"}, {$set:{"settings.items.label": "Item"}},{ multi: true });
db.getCollection('sections').update({"stage": "question"}, {$set:{"settings.items.label": "Item"}},{ multi: true });
db.getCollection('sections').update({"stage": "brainstorm"}, {$set:{"settings.items.label": "Item"}},{ multi: true });
db.getCollection('sections').update({"stage": "evaluation"}, {$set:{"settings.items.label": "Issue"}},{ multi: true });
db.getCollection('sections').update({"stage": "deepening"}, {$set:{"settings.items.label": "Item"}},{ multi: true });
db.getCollection('sections').update({"stage": "structuring"}, {$set:{"settings.items.label": "Option"}},{ multi: true });
db.getCollection('sections').update({"stage": "conclusion"}, {$set:{"settings.items.label": "conclusion"}},{ multi: true });

db.getCollection('sections').update({"stage": "structuring"}, {$set:{"settings.items.tagging" : false}},{ multi: true });

db.getCollection('users').update({}, {$unset: {"oauth2_token": 1}}, {multi:true});    
db.getCollection('users').update({}, {$unset: {"oauth2_expire": 1}}, {multi:true});    
db.getCollection('users').update({}, {$unset: {"socketid": 1}}, {multi:true});        
db.getCollection('users').update({'admin':0}, {$set: {"admin": 1}}, {multi:true});    


db.getCollection('items').update({'slug':'fi_context', 'title': {$ne:'Context'}}, {$set:{"title": "Context"}},{ multi: true });
db.getCollection('items').update({'slug':'fi_question', 'title': {$ne:'Question'}}, {$set:{"title": "Question"}},{ multi: true });

db.getCollection('episodes').find({}).forEach(
  function(e) {
    e.mail_slug = e.mail_slug.toLowerCase();
    db.getCollection('episodes').save(e);
  }

db.getCollection('sections').update({}, {$set: {"settings.items.duplicate": false}}, {multi:true});    
db.getCollection('sections').update({"stage": "brainstorm"}, {$set:{"settings.items.duplicate": true}},{ multi: true });
