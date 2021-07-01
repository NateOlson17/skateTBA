// @flow

import { Dimensions, Alert } from 'react-native';
import React, { Component } from 'react';
import Clipboard from 'expo-clipboard';
import type { PComment, PImage, RegionState } from './constants.js';
import { showLocation } from 'react-native-map-link';
import * as Permissions from 'expo-permissions';
import { db } from './config';
import * as ImagePicker from 'expo-image-picker';
import { uriToBase64 } from './constants'


export class PointOfInterest {
    constructor(obj: PointOfInterest) {
        this.accessibility = obj.accessibility;
        this.comments = obj.comments;
        this.condition = obj.condition;
        this.id = obj.id;
        this.images = obj.images;
        this.regionState = obj.regionState;
        this.security = obj.security;
        this.skillLevel = obj.skillLevel;
        this.type = obj.type;
        this.numRatings = obj.numRatings;
    }

    accessibility: number;
    comments: PComment[];
    condition: number;
    id: string;
    images: PImage[];
    regionState: RegionState;
    security: number;
    skillLevel: number;
    type: string;
    numRatings: number;

    sharePOIurl() {
        Clipboard.setString(`maps.google.com/maps?q=${this.regionState.latitude},${this.regionState.longitude}`);
        Alert.alert('Link copied to clipboard.');
    };

    initiateNavigation(lat: number, lon: number) {
        showLocation({
            latitude: this.regionState.latitude,
            longitude: this.regionState.longitude,
            sourceLatitude: lat, 
            sourceLongitude: lon, 
            alwaysIncludeGoogle: true, 
            dialogTitle: 'Select an app to open this skate spot!',
            dialogMessage: 'These are the compatible apps we found on your device.',
            cancelText: 'No thanks, I don\'t want to hit this spot.'
        });
    };

    async addPOIimage() {
        let currentImages: PImage[] = this.images;
        let imageTemp: PImage = {data: '', key: '', type: ''}; 
        const { status } = await Permissions.askAsync(Permissions.CAMERA); 
        console.log('cam perms', status);
        if (status !== 'granted') {
            Alert.alert('You need to allow camera permissions to take pictures of the cool skate spots you find!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.'); return;
        }

        const addResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Image,
        allowsEditing: true,
        aspect: [1, 1], //require square crop
        quality: .5,
        videoMaxDuration: 30
        });

        if (!addResult.cancelled) {
        imageTemp = {key: currentImages.length.toString(), data: await uriToBase64(addResult.uri), type: addResult.type}; //capture image and pend to push
        }
        currentImages.push(imageTemp); 

        db.ref(`/poi/${this.id}`).update({images: currentImages});
  };
};