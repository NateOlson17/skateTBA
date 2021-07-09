// @flow

import { View, Dimensions, Alert, Animated, FlatList, TouchableOpacity, Image, Text, TextInput } from 'react-native';
import { FlingGestureHandler, State, Directions } from 'react-native-gesture-handler';
import React, { Component } from 'react';
import Clipboard from 'expo-clipboard';
import type { PComment, PImage, RegionState } from './constants.js';
import { showLocation } from 'react-native-map-link';
import * as Permissions from 'expo-permissions';
import { db } from './config';
import * as ImagePicker from 'expo-image-picker';
import { uriToBase64, FRAME_WIDTH, FRAME_HEIGHT, POS_COLOR } from './constants';
import { styles } from './styles';


export class PointOfInterest extends Component<{}, any> {
    constructor(obj: PointOfInterest, app: any) {
        super();
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
        this.app = app;
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
    app: any;

    sharePOIurl() {
        Clipboard.setString(`maps.google.com/maps?q=${this.regionState.latitude},${this.regionState.longitude}`);
        Alert.alert('Link copied to clipboard.');
    };

    initiateNavigation() {
        showLocation({
            latitude: this.regionState.latitude,
            longitude: this.regionState.longitude,
            sourceLatitude: this.app.state.regionState.latitude, 
            sourceLongitude: this.app.state.regionState.longitude, 
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

  enableCurrentPOI_images: (() => void) = () => {
    this.app.nullifyCommentMenu();
    this.app.nullifyFilterMenu();
    this.app.nullifySecondaryRatingPanel();

    let animVal = new Animated.Value(2 * FRAME_HEIGHT);
    this.app.state.currentPOI_images =  
                          <FlingGestureHandler
                            direction = {Directions.DOWN}
                            onHandlerStateChange={({ nativeEvent }) => {
                              if (nativeEvent.state === State.ACTIVE) {
                                Animated.timing(animVal, {useNativeDriver: false, toValue: 2 * FRAME_HEIGHT}).start();
                                  setTimeout(() => {this.app.state.currentPOI_images = null}, 100);
                              }
                          }}>
                            <Animated.View style = {[styles.POIimagesWrapper, {top: animVal}]}>
                              <View style = {styles.POIdisplayAdditionalMenu_ContentWrapper}>
                                <View style={styles.gestureBar}/>

                                <FlatList
                                  style = {{paddingLeft: 20}}
                                  data = {this.images}
                                  renderItem = {({ item }) => ( 
                                                                <TouchableOpacity onPress = {() => {this.app.displayFullsizeImage(item)}}>
                                                                  <Image source = {{uri: `data:image/jpeg;base64,${item.data}`}} style = {styles.FlatListPerImg}/>
                                                                </TouchableOpacity> 
                                                              )}
                                  horizontal = {true}
                                  initialNumToRender = {5}
                                />

                                <TouchableOpacity onPress = {() => {this.app.nullifyImageMenu()}} style = {styles.POIexit_TO}>
                                  <Image source = {require('./components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
                                </TouchableOpacity>
                              </View>
                            </Animated.View>
                          </FlingGestureHandler>

    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 0}).start(); //animate menu slide-in
  };

  enableCurrentPOI_comments: (() => void) = () => {
    this.app.nullifyImageMenu();
    this.app.nullifyFilterMenu();
    this.app.nullifySecondaryRatingPanel();

    let animVal = new Animated.Value(2 * FRAME_HEIGHT);
    this.app.state.currentPOI_comments =
                            <FlingGestureHandler
                              direction = {Directions.DOWN}
                              onHandlerStateChange={({ nativeEvent }) => {
                                if (nativeEvent.state === State.ACTIVE) {
                                  Animated.timing(animVal, {useNativeDriver: false, toValue: 2 * FRAME_HEIGHT}).start(); //swipe-down animation
                                  setTimeout(() => {this.app.state.currentPOI_comments = null}, 100);
                                }
                            }}>
                              <Animated.View style = {[styles.POIcommentsWrapper, {top: animVal}]}>
                                <View style = {styles.POIdisplayAdditionalMenu_ContentWrapper}>
                                  <View style={styles.gestureBar}/>

                                  {
                                  this.comments ?
                                    <FlatList
                                      style = {{paddingLeft: 20, zIndex: 6, marginTop: 40}}
                                      data = {this.comments}
                                      renderItem = {({ item }) => (<Text style = {{width: 200, height: 180}} allowFontScaling = {false}>{item.text}</Text>)}
                                      horizontal = {true}
                                      initialNumToRender = {5}
                                    />
                                  :
                                    <Text allowFontScaling = {false} style = {{alignSelf: 'center'}}>NO COMMENTS</Text>
                                  }

                                  <TouchableOpacity onPress = {() => {this.app.nullifyCommentMenu()}} style = {styles.POIexit_TO}>
                                    <Image source = {require('./components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
                                  </TouchableOpacity>
                                </View>
                              </Animated.View>
                            </FlingGestureHandler>

    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 0}).start(); //appearance animation
  };

  addPOIcomment: (() => void) = () => {
    this.app.nullifyCurrentPOI();
    this.app.nullifyFilterMenu();
    this.app.nullifySecondaryRatingPanel();

    this.app.state.ipComment = '';
    this.app.state.commentInterface = <View style = {{position: 'absolute', height: FRAME_HEIGHT, width: FRAME_WIDTH, backgroundColor: 'rgba(255, 255, 255, 0.8)'}}>
                          <TouchableOpacity onPress = {() => {this.app.state.commentInterface = null}} style = {[styles.commentActionButtons, {right: 50}]}>
                            <Image source = {require('./components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
                          </TouchableOpacity>

                          {/*$FlowIgnore flow assumes textAlign is invalid prop*/}
                          <TextInput style = {{position: 'absolute', left: FRAME_WIDTH / 2 - 50, bottom: FRAME_HEIGHT / 4, width: 100, height: 300}}
                              allowFontScaling = {false}
                              placeholder = 'Say something about this spot!'
                              placeholderTextColor = {POS_COLOR}
                              maxLength = {100}
                              clearButtonMode = 'while-editing'
                              multiline
                              textAlign = 'center'
                              onChangeText = {(text) => this.app.state.ipComment = text}
                            />

                          <TouchableOpacity onPress = {() => {this.app.POIcommentSubmissionHandler(this)}} style = {[styles.commentActionButtons, {right: 80}]}>
                            <Image source = {require('./components/submitComment.png')} style = {styles.POIexit_generic}/>
                          </TouchableOpacity>
                        </View>
  };
};