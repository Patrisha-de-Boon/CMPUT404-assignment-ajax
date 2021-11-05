#!/usr/bin/env python
# coding: utf-8
# Copyright 2013 Abram Hindle
# Copyright 2021 Patrisha de Boon
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# In Adition, some code was taken from the in class observer example 
# which uses the same apache lisense as this file. The example can be
# found at 
#       
#       https://github.com/uofa-cmput404/cmput404-slides/blob/master/examples/ObserverExampleAJAX/server.py
#       Copyright 2013 Abram Hindle
#       Copyright 2019 Hazel Victoria Campbell
# 
# You can start this by executing it in python:
# python server.py
#
# remember to:
#     pip install flask


import flask
from flask import Flask, request, url_for, redirect, jsonify
import json

app = Flask(__name__)
app.debug = True

# An example world
# {
#    'a':{'x':1, 'y':2},
#    'b':{'x':2, 'y':3}
# }

class World:
    def __init__(self):
        self.eTag = 0
        self.clear()
        
    def update(self, entity, data):
        entry = self.space.get(entity, dict())
        for key in data:
            entry[key] = data[key]
        self.space[entity] = entry
        self.notify_all(entity, entry)

    def set(self, entity, data):
        self.space[entity] = data
        self.notify_all(entity, data)

    def clear(self):
        self.space = dict()
        self.listeners = dict()

    def get(self, entity):
        return self.space.get(entity, dict())
    
    def world(self):
        return self.space

    # The following 4 functions are from https://github.com/uofa-cmput404/cmput404-slides/blob/master/examples/ObserverExampleAJAX/server.py
    def notify_all(self,entity,data):
        for listener in self.listeners:
           self.listeners[listener][entity] = data

    def add_listener(self,listener_name):
	    self.listeners[listener_name] = dict()

    def get_listener(self, listener_name):
        if (listener_name in self.listeners):
	        return self.listeners[listener_name]
        return None

    def clear_listener(self, listener_name):
        if (listener_name in self.listeners):
            self.listeners[listener_name] = dict()

# you can test your webservice from the commandline
# curl -v   -H "Content-Type: application/json" -X PUT http://127.0.0.1:5000/entity/X -d '{"x":1,"y":1}' 

myWorld = World()

# I give this to you, this is how you get the raw body/data portion of a post in flask
# this should come with flask but whatever, it's not my project.
def flask_post_json():
    '''Ah the joys of frameworks! They do so much work for you
       that they get in the way of sane operation!'''
    if (request.json != None):
        return request.json
    elif (request.data != None and request.data.decode("utf8") != u''):
        return json.loads(request.data.decode("utf8"))
    else:
        return json.loads(request.form.keys()[0])

@app.route("/")
def hello():
    '''Return something coherent here.. perhaps redirect to /static/index.html '''
    return redirect(url_for('static', filename='index.html'))

@app.route("/entity/<entity>", methods=['POST','PUT'])
def update(entity):
    '''update the entities via this interface'''
    # myWorld.update(entity, )
    json_data = flask.request.get_json(True)
    myWorld.update(entity, json_data)

    return jsonify(myWorld.get(entity))

@app.route("/entities", methods=['POST','PUT'])
def setEntities():
    '''set the entities via this interface'''
    # myWorld.update(entity, )
    json_data = json.loads(flask.request.json)
    for entity in json_data:
        myWorld.set(entity, json_data[entity])

    return jsonify(myWorld.get(entity))

@app.route("/world", methods=['POST','GET'])    
def world():
    '''you should probably return the world here'''
    return jsonify(myWorld.space)

@app.route("/entity/<entity>")    
def get_entity(entity):
    '''This is the GET version of the entity interface, return a representation of the entity'''
    return jsonify(myWorld.get(entity))

@app.route("/clear", methods=['POST','GET'])
def clear():
    '''Clear the world out!'''
    myWorld.clear()
    return jsonify(myWorld.space)

####
# The following 2 functions are adapted from https://github.com/uofa-cmput404/cmput404-slides/blob/master/examples/ObserverExampleAJAX/server.py
####

@app.route("/listener/<listener_name>", methods=['POST','PUT'])
def add_listener(listener_name):
    myWorld.add_listener(listener_name)
    return flask.jsonify(dict())

@app.route("/listener/<listener_name>")
def get_listener(listener_name):
    listener = myWorld.get_listener(listener_name)
    if (listener == None):
        return flask.abort(404)
    else:
        myWorld.clear_listener(listener_name)
        return flask.jsonify(listener)

if __name__ == "__main__":
    app.run()
