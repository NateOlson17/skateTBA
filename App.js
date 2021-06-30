// @flow

import React, { Component } from 'react';
import { View, Image, TouchableOpacity, Text, Alert, StatusBar, Platform, FlatList, Animated, TextInput } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { text } from 'react-native-communications';
import RadioButtonRN from 'radio-buttons-react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import { showLocation } from 'react-native-map-link';
import { FlingGestureHandler, State, Directions } from 'react-native-gesture-handler';
import Clipboard from 'expo-clipboard';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import * as Font from 'expo-font';

import fontelloConfig from './src/fonts/config.json';
import { db } from './src/config';
import { darkMapStyle, POS_COLOR, NEG_COLOR, NEUTRAL_COLOR, FRAME_WIDTH, FRAME_HEIGHT, PLUS_ICON_DIM, POI_MENU_DIM } from './src/constants';
import type { PointOfInterest, PImage, PComment, FilterConstraint } from './src/constants';
import { createSlider, createRatingBar, createCurrentPOIAction, createRangeSlider, createCheckbox } from './src/componentCreation';
import { styles } from './src/styles';

//settings/info
//cache images?
//finish secondary rating system
//prompt for rating when leaving area
//add video support
//adding comments/ratings invalidates poi

//LOWER PRIORITY
//widget that shows surrounding points
//app rating prompts
//haptics/3d touch (which models?)
//icon/splash/etc (icon 1024x1024)
//make sure permissions dont break the app
//test different ios versions

const Icon = createIconSetFromFontello(fontelloConfig);
let imageButtonAnimVal = new Animated.Value(-500);
let imageSampleAnimVal = new Animated.Value(-500);
let filterTypesAnimVal = new Animated.Value(-500);

export default class App extends Component<{}, any> {
  constructor(props: any) {
    super(props);
    this.state = { //general main process dynamic reference storage

      regionState: null, //carries region lat/lon and corresponding deltas
      currentHeading: 0,
      didMount: false,
      darkModeEnabled: false,
      displayPOImenu: false,

      //data holds for user inputs awaiting RTDB push
      pendingPOI_skillLevel: null,
      pendingPOI_accessibility: null,
      pendingPOI_type: null,
      pendingPOI_condition: null,
      pendingPOI_security: null,
      pendingPOI_image: null,

      //used for database pull (for POIs) on component mount
      markers: [],
      filteredMarkers: [],

      //selected/pending POI display information
      currentPOI: null,
      currentPOI_images: null,
      currentPOI_comments: null,
      addPOImenu: null,
      secondaryRatingPanel: null,

      commentInterface: null,
      ipComment: '',

      fullImg: null,

      //filter menu display
      filterMenu: null,
      filters: {
        condition_min: 0, condition_max: 10, security_min: 0, security_max: 10, 
        skillLevel_min: 0, skillLevel_max: 10, accessibility_min: 0, accessibility_max: 10
      },
      validTypes: { Ramp: true, Rail: true, Ledge: true, Gap: true }

    };
  }


  /////////////////////////////////////////////////LOCATION AND MOUNT TASKS///////////////////////////////////////////////////////////////////////
  location: any
  heading: any
  _getLocationAsync: (() => any) = async () => {
    if (!this.state.didMount) {return;}
    this.location = await Location.watchPositionAsync(
      {
        enableHighAccuracy: true,
        distanceInterval: .1, //units of degrees lat/lon
        timeInterval: 100 //updates location every 100ms
      },
      newLocation => { //'on event refresh' function
        let { coords } = newLocation;
        this.setState({regionState: {
                                      latitude: coords.latitude, //rip lat and lon from newLocation var stored in coords
                                      longitude: coords.longitude,
                                      latitudeDelta: 0.01, //establish deltas
                                      longitudeDelta: 0.01,
                                    }
        }); //push region updates to state struct
      },
    );

    this.heading = await Location.watchHeadingAsync(
      newHeading => {this.setState({currentHeading: newHeading.trueHeading});} //update state on heading event refresh
    );
  };

  componentDidMount: (() => Promise<void>) = async () => {
    console.log('FW x FH =>', FRAME_WIDTH, FRAME_HEIGHT); //display frame dimensions in console (UIkit sizes, not true pixel)
    this.setState({didMount: true});
    
    db.ref('/poi').on('value', (snapshot) => {
      let markersTemp = snapshot.val();
      //$FlowIssue[incompatible-use] flow assumes markersTemp[key] is incorrectly typed key accessing index of markersTemp[]
      markersTemp = Object.keys(markersTemp).map((key) => [String(key), markersTemp[key]]); //map object string identifiers assigned by Firebase to object info
      this.setState({markers: []});
      let i: number;
      for (i = 0; i < markersTemp.length; i++) { //iterate through the remapped snapshot
        markersTemp[i][1].id = markersTemp[i][0]; //use FB-assigned string identifiers as object properties (id)
        this.state.markers.push(markersTemp[i][1]); //push object from remap to markers state var
      }
      this.setState({filteredMarkers: this.state.markers})
    });

    const {status} = await Permissions.askAsync(Permissions.LOCATION);
    if (status === 'granted') {
      this._getLocationAsync();
    } else {
      Alert.alert('You need to allow location permissions for the map to function properly!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.');
    }
    console.log('location perms', status);

    await Font.loadAsync({fontello: require('./src/fonts/fontello.ttf')});
  };

  componentWillUnmount: (() => void) = () => {this.setState({didMount: false})}; //update state (checked for in _getLocationAsync)


 ///////////////////////////////////////////////////POI Addition, Bug Reports, & Mode Switching/////////////////////////////////////////////////////////////////

  initiate_addPOI: (() => void) = () => {
    this.nullifyCurrentPOI();
    this.nullifyFilterMenu();
    this.nullifySecondaryRatingPanel();
    this.setState({pendingPOI_image: null, pendingPOI_type: null});
    this.setState({displayPOImenu: !this.state.displayPOImenu});
    
    if (this.state.displayPOImenu) {this.setState({addPOImenu: null}); return;}
    let animVal = new Animated.Value(-500);
    imageButtonAnimVal = new Animated.Value(-500);
    imageSampleAnimVal = new Animated.Value(-500);
    this.setState({
      addPOImenu: <Animated.View style = {[styles.POIAdditionWrapper, {bottom: animVal}]}>
                    <Image style = {styles.POIAdditionBG} source = {require('./src/components/POI_menu.png')}/>

                    {createSlider(value => {this.setState({pendingPOI_accessibility: value});}, 'Accessibility')}
                    {createSlider(value => {this.setState({pendingPOI_skillLevel: value});}, 'Skill Level')}
                    {createSlider(value => {this.setState({pendingPOI_security: value});}, 'Security')}
                    {createSlider(value => {this.setState({pendingPOI_condition: value});}, 'Condition')}

                    <View style = {{width: POI_MENU_DIM, backgroundColor: NEUTRAL_COLOR, height: 1}}/>
                    
                    <RadioButtonRN
                      style = {{paddingLeft: POI_MENU_DIM * .15}}
                      data = {[{label: 'Ramp'}, {label: 'Rail'}, {label: 'Ledge'}, {label: 'Gap'}]}
                      box = {false}
                      icon = {<Icon name = 'boy-on-skateboard-silhouette' size = {25} color = {POS_COLOR}/>}
                      selectedBtn = {(e) => {this.state.pendingPOI_type = e.label}}
                      animationTypes = {['pulse', 'rotate']}
                    /> 

                    <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold', lineHeight: 38, paddingLeft: POI_MENU_DIM * .035}}>
                      Ramp{'\n'}Rail{'\n'}Ledge{'\n'}Gap{'\n'}
                    </Text>

                    <TouchableOpacity onPress = {this.pushPOIdata} style = {styles.submitPOIbutton}>  
                      <Image
                        source = {require('./src/components/submitPOI.png')}
                        style = {{position: 'absolute', width: POI_MENU_DIM * .2, height: POI_MENU_DIM * .2, resizeMode: 'contain'}}
                      />
                    </TouchableOpacity>
                  </Animated.View>
    });
    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: FRAME_HEIGHT * .04 + PLUS_ICON_DIM}).start();
    Animated.spring(imageButtonAnimVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: FRAME_HEIGHT * .04 + PLUS_ICON_DIM + 170}).start();
    Animated.spring(imageSampleAnimVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: FRAME_HEIGHT * .04 + PLUS_ICON_DIM + 85}).start();
  };

  darkModeSwitch: (() => void) = () => {this.setState({darkModeEnabled: !this.state.darkModeEnabled});}

  initBugReport: (() => void) = () => {text('17085574833', 'Bug Report or Suggestion:\n');}

  pushPOIdata: (() => Promise<void>) = async () => {
    if (this.state.pendingPOI_type && this.state.regionState && this.state.pendingPOI_image) {
      console.log('pushing to RTDB');
      db.ref('/poi').push({ //push POI data to directory
        skillLevel: this.state.pendingPOI_skillLevel,
        accessibility: this.state.pendingPOI_accessibility,
        type: this.state.pendingPOI_type,
        condition: this.state.pendingPOI_condition,
        security: this.state.pendingPOI_security,
        regionState: {latitude: this.state.regionState.latitude, longitude: this.state.regionState.longitude},
        images: [{key: '0', data: await this.uriToBase64(this.state.pendingPOI_image.uri), type: this.state.pendingPOI_image.type}],//await promise response from helper func, then push base64 return value
        numRatings: 1
      });
      this.setState({displayPOImenu: false, addPOImenu: null});
      Alert.alert('Your skate spot has been added to the database!😎 \n\n(This is monitored and spam entries will be deleted)');
    } else {
      Alert.alert('Please fill out all fields. Remember to select a type and image!😄');
    }
  };

  uriToBase64: ((uripath: string) => Promise<empty>) = async uripath => {
    const result = await ImageManipulator.manipulateAsync(uripath, [], {base64: true, compress: .4, format: ImageManipulator.SaveFormat.JPEG});
    return result.base64;
  };

  selectImage: (() => Promise<void>) = async () => { //triggered by select image button on POI addition menu
    const {status} = await Permissions.askAsync(Permissions.CAMERA);
    console.log('cam perms', status);
    if (status !== 'granted') {
      Alert.alert('You need to allow camera permissions to take pictures of the cool skate spots you find!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.'); return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], //require square crop
      quality: .5,
    });

    if (!result.cancelled) {
      this.setState({pendingPOI_image: result});
    }
  };


  //////////////////////////////////////////////////////////////POI Viewing & Image/Comment Addition/////////////////////////////////////////////////////////////////////////////

  nullifyCurrentPOI: (() => void) = () => {this.setState({currentPOI: null, currentPOI_images: null, currentPOI_comments: null});} //helper functions to get rid of unneeded menu renders
  nullifyImageMenu: (() => void) = () => {this.setState({currentPOI_images: null});}
  nullifyCommentMenu: (() => void) = () => {this.setState({currentPOI_comments: null});}
  nullifyFilterMenu: (() => void) = () => {this.setState({filterMenu: null});}
  nullifySecondaryRatingPanel: (() => void) = () => {this.setState({secondaryRatingPanel: null});}

  POIactivationHandler: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    this.nullifyCommentMenu();
    this.nullifyImageMenu();
    let viewAnim = new Animated.Value(-500);
    let accessibilityIndicatorLM = new Animated.Value(0); let skillLevelIndicatorLM = new Animated.Value(0);
    let securityIndicatorLM = new Animated.Value(0); let conditionIndicatorLM = new Animated.Value(0);
    this.setState({
      currentPOI: <FlingGestureHandler
                    direction = {Directions.DOWN}
                    onHandlerStateChange={({ nativeEvent }) => {
                      if (nativeEvent.state === State.ACTIVE) {
                        Animated.timing(viewAnim, {useNativeDriver: false, toValue: -500}).start(); //animates swipe-down
                        setTimeout(() => {this.nullifyCurrentPOI();}, 200);
                      }
                  }}>
                    <Animated.View style = {[styles.currentPOIWrapper, {bottom: viewAnim}]}>
                      <View style={styles.gestureBar}/>

                      <View style={{paddingTop: 40}}>
                        {createRatingBar(poi_obj['accessibility'], 'Accessibility:', accessibilityIndicatorLM, 10)}
                        {createRatingBar(poi_obj['skillLevel'], 'Skill Level:', skillLevelIndicatorLM, 29)}
                        {createRatingBar(poi_obj['condition'], 'Condition:', conditionIndicatorLM, 30)}
                        {createRatingBar(poi_obj['security'], 'Security:', securityIndicatorLM, 39)}

                        <Text allowFontScaling = {false} style = {{fontWeight: 'bold', paddingLeft: 63}}>Type:             {poi_obj.type}</Text>
                        
                        <View style={{flexDirection: 'row'}}>
                          <Text allowFontScaling = {false} style = {{fontWeight: 'bold', paddingLeft: 63}}>{poi_obj.numRatings} Rating{poi_obj.numRatings > 1 ? 's' : ''}</Text>
                          <TouchableOpacity onPress = {() => {this.modifyRating(poi_obj)}}>
                            <View style={{backgroundColor: POS_COLOR, borderRadius: 10, width: 120, paddingLeft: 5}}>
                              <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>Rate this spot!</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{width: 150, height: 150, paddingTop: 50, paddingLeft: 10, flexWrap: 'wrap'}}>       
                          {createCurrentPOIAction(() => this.enableCurrentPOI_images(poi_obj), 50, 0, require('./src/components/viewPhotos.png'))}
                          {createCurrentPOIAction(() => this.addPOIimage(poi_obj), 40, 5, require('./src/components/addPhoto.png'))}
                          {createCurrentPOIAction(() => this.enableCurrentPOI_comments(poi_obj), 50, 0, require('./src/components/viewComments.png'))}
                          {createCurrentPOIAction(() => this.addPOIcomment(poi_obj), 40, 5, require('./src/components/addComment.png'))}
                          {createCurrentPOIAction(() => this.initiateNavigation(poi_obj), 50, 0, require('./src/components/navigationPin.png'))}
                          {createCurrentPOIAction(() => this.sharePOIurl(poi_obj), 50, 0, require('./src/components/sharePOI.png'))}
                      </View>

                      <TouchableOpacity onPress = {() => {this.nullifyCurrentPOI()}} style = {styles.POIexit_TO}>
                        <Image source = {require('./src/components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
                      </TouchableOpacity>
                    </Animated.View>
                  </FlingGestureHandler>
    });
    Animated.spring(viewAnim, {useNativeDriver: false, friction: 5, tension: 4, toValue: FRAME_HEIGHT * .04 + PLUS_ICON_DIM + 10}).start();
    setTimeout(() => {
      Animated.spring(accessibilityIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj['accessibility']}).start();
      Animated.spring(conditionIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj['condition']}).start();
      Animated.spring(skillLevelIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj['skillLevel']}).start();
      Animated.spring(securityIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj['security']}).start();
    }, 300);
  };

  enableCurrentPOI_images: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    this.nullifyCommentMenu();
    this.nullifyFilterMenu();
    this.nullifySecondaryRatingPanel();

    let animVal = new Animated.Value(2 * FRAME_HEIGHT);
    this.setState({
      currentPOI_images:  <FlingGestureHandler
                            direction = {Directions.DOWN}
                            onHandlerStateChange={({ nativeEvent }) => {
                              if (nativeEvent.state === State.ACTIVE) {
                                Animated.timing(animVal, {useNativeDriver: false, toValue: 2 * FRAME_HEIGHT}).start();
                                  setTimeout(() => {this.setState({currentPOI_images: null});}, 100);
                              }
                          }}>
                            <Animated.View style = {[styles.POIimagesWrapper, {top: animVal}]}>
                              <View style = {styles.POIdisplayAdditionalMenu_ContentWrapper}>
                                <View style={styles.gestureBar}/>

                                <FlatList
                                  style = {{paddingLeft: 20}}
                                  data = {poi_obj.images}
                                  renderItem = {({ item }) => ( 
                                                                <TouchableOpacity onPress = {() => {this.displayFullsizeImage(item)}}>
                                                                  <Image source = {{uri: `data:image/jpeg;base64,${item.data}`}} style = {styles.FlatListPerImg}/>
                                                                </TouchableOpacity> 
                                                              )}
                                  horizontal = {true}
                                  initialNumToRender = {5}
                                />

                                <TouchableOpacity onPress = {() => {this.nullifyImageMenu()}} style = {styles.POIexit_TO}>
                                  <Image source = {require('./src/components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
                                </TouchableOpacity>
                              </View>
                            </Animated.View>
                          </FlingGestureHandler>
    });
    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 0}).start(); //animate menu slide-in
  };

  displayFullsizeImage: ((img: PImage) => void) = img => {//display fullscreen image with swipe-down handler (no animation)
    this.setState({fullImg: <FlingGestureHandler
                              direction = {Directions.DOWN}
                              onHandlerStateChange={({ nativeEvent }) => {
                                if (nativeEvent.state === State.ACTIVE) {
                                  this.setState({fullImg: null});
                                }
                            }}>
                              <View style = {styles.fullScreenImgView}>
                                <Image source = {{uri: `data:image/jpeg;base64,${img.data}`}} style = {{height: FRAME_WIDTH, width: FRAME_WIDTH, resizeMode: 'contain'}}/>
                              </View>
                            </FlingGestureHandler>                       
    });
  };

  addPOIimage: ((poi_obj: PointOfInterest) => Promise<void>) = async poi_obj => {
    let currentImages: PImage[] = poi_obj.images;
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
      imageTemp = {key: currentImages.length.toString(), data: await this.uriToBase64(addResult.uri), type: addResult.type}; //capture image and pend to push
    }
    currentImages.push(imageTemp); 

    db.ref(`/poi/${poi_obj.id}`).update({images: currentImages});
  };

  enableCurrentPOI_comments: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    this.nullifyImageMenu();
    this.nullifyFilterMenu();
    this.nullifySecondaryRatingPanel();

    let animVal = new Animated.Value(2 * FRAME_HEIGHT);
    this.setState({
      currentPOI_comments:  <FlingGestureHandler
                              direction = {Directions.DOWN}
                              onHandlerStateChange={({ nativeEvent }) => {
                                if (nativeEvent.state === State.ACTIVE) {
                                  Animated.timing(animVal, {useNativeDriver: false, toValue: 2 * FRAME_HEIGHT}).start(); //swipe-down animation
                                  setTimeout(() => {this.setState({currentPOI_comments: null});}, 100);
                                }
                            }}>
                              <Animated.View style = {[styles.POIcommentsWrapper, {top: animVal}]}>
                                <View style = {styles.POIdisplayAdditionalMenu_ContentWrapper}>
                                  <View style={styles.gestureBar}/>

                                  {
                                  poi_obj.comments ?
                                    <FlatList
                                      style = {{paddingLeft: 20, zIndex: 6, marginTop: 40}}
                                      data = {poi_obj.comments}
                                      renderItem = {({ item }) => (<Text style = {{width: 200, height: 180}} allowFontScaling = {false}>{item.text}</Text>)}
                                      horizontal = {true}
                                      initialNumToRender = {5}
                                    />
                                  :
                                    <Text allowFontScaling = {false} style = {{alignSelf: 'center'}}>NO COMMENTS</Text>
                                  }

                                  <TouchableOpacity onPress = {() => {this.nullifyCommentMenu()}} style = {styles.POIexit_TO}>
                                    <Image source = {require('./src/components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
                                  </TouchableOpacity>
                                </View>
                              </Animated.View>
                            </FlingGestureHandler>
    });
    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 0}).start(); //appearance animation
  };

  addPOIcomment: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    this.nullifyCurrentPOI();
    this.nullifyFilterMenu();
    this.nullifySecondaryRatingPanel();

    this.setState({
      ipComment: '',
      commentInterface: <View style = {{position: 'absolute', height: FRAME_HEIGHT, width: FRAME_WIDTH, backgroundColor: 'rgba(255, 255, 255, 0.8)'}}>
                          <TouchableOpacity onPress = {() => {this.setState({commentInterface: null});}} style = {[styles.commentActionButtons, {right: 50}]}>
                            <Image source = {require('./src/components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
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
                              onChangeText = {(text) => this.setState({ipComment: text})}
                            />

                          <TouchableOpacity onPress = {() => {this.POIcommentSubmissionHandler(poi_obj)}} style = {[styles.commentActionButtons, {right: 80}]}>
                            <Image source = {require('./src/components/submitComment.png')} style = {styles.POIexit_generic}/>
                          </TouchableOpacity>
                        </View>
    });
  };

  POIcommentSubmissionHandler: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    if (!this.state.ipComment) {return;}
    this.setState({commentInterface: null});
    let currentComments: PComment[] = poi_obj.comments ? poi_obj.comments : [];
    currentComments.push({key: currentComments.length.toString(), text: this.state.ipComment})
    db.ref(`/poi/${poi_obj.id}`).update({comments: currentComments});
  }

  initiateNavigation: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    showLocation({
      latitude: poi_obj.regionState.latitude,
      longitude: poi_obj.regionState.longitude,
      sourceLatitude: this.state.regionState.latitude, 
      sourceLongitude: this.state.regionState.longitude, 
      alwaysIncludeGoogle: true, 
      dialogTitle: 'Select an app to open this skate spot!',
      dialogMessage: 'These are the compatible apps we found on your device.',
      cancelText: 'No thanks, I don\'t want to hit this spot.'
    });
  };

  sharePOIurl: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    Clipboard.setString(`maps.google.com/maps?q=${poi_obj.regionState.latitude},${poi_obj.regionState.longitude}`);
    Alert.alert('Link copied to clipboard.');
  };

  modifyRating: ((poi_obj: PointOfInterest) => void) = poi_obj => {
    this.nullifyCommentMenu();
    this.nullifyFilterMenu();
    this.nullifyImageMenu();

    let newConditionRating: number; let newAccessibilityRating: number; let newSkillLevelRating: number; let newSecurityRating: number;

    this.setState({
      secondaryRatingPanel: <View style = {styles.secondaryRatingPanel}>
                                  <TouchableOpacity onPress = {() => {this.nullifySecondaryRatingPanel()}} style = {styles.POIexit_TO}>
                                    <Image source = {require('./src/components/pointDisplay_x.png')} style = {styles.POIexit_generic}/>
                                  </TouchableOpacity>

                                  {createSlider(value => {newConditionRating = value}, 'Condition')}
                                  {createSlider(value => {newAccessibilityRating = value}, 'Accessibility')}
                                  {createSlider(value => {newSkillLevelRating = value}, 'Skill Level')}
                                  {createSlider(value => {newSecurityRating = value}, 'Security')}

                                <TouchableOpacity onPress = {() => {this.nullifySecondaryRatingPanel(); this.calculateNewRating(poi_obj, newConditionRating, newAccessibilityRating, newSkillLevelRating, newSecurityRating);}}>
                                  <Image
                                    source = {require('./src/components/submitPOI.png')}
                                    style = {{width: POI_MENU_DIM * .2, height: POI_MENU_DIM * .2, resizeMode: 'contain', paddingLeft: POI_MENU_DIM}}
                                  />
                                </TouchableOpacity>
                              </View>
    })
  }

  calculateNewRating: any = (poi_obj: PointOfInterest, newCond: number, newAcc: number, newSkill: number, newSec: number) => {
    const newCondition: number = ((poi_obj.numRatings * poi_obj.condition) + newCond)/(poi_obj.numRatings + 1);
    const newSkillLevel: number = ((poi_obj.numRatings * poi_obj.skillLevel) + newSkill)/(poi_obj.numRatings + 1);
    const newAccessibility: number = ((poi_obj.numRatings * poi_obj.accessibility) + newAcc)/(poi_obj.numRatings + 1);
    const newSecurity: number = ((poi_obj.numRatings * poi_obj.security) + newSec)/(poi_obj.numRatings + 1);
    db.ref(`/poi/${poi_obj.id}`).update({numRatings: poi_obj.numRatings + 1, condition: newCondition, skillLevel: newSkillLevel, accessibility: newAccessibility, security: newSecurity});
  }


  ////////////////////////////////////////////////////////////////Filtering///////////////////////////////////////////////////////////////////
  
  bound: ((target: number, min: number, max: number) => boolean) = (target, min, max) => (target >= min && target <= max)

  changeFilteredList: (() => void) = () => {
    const f: FilterConstraint = this.state.filters;

    let i: number, tempArr: PointOfInterest[] = [];
    for (i = 0; i < this.state.markers.length; i++) {
      let currMarker: PointOfInterest = this.state.markers[i];
      if (this.bound(currMarker.condition, f.condition_min, f.condition_max) &&
          this.bound(currMarker.security, f.security_min, f.security_max) && 
          this.bound(currMarker.accessibility, f.accessibility_min, f.accessibility_max) &&
          this.bound(currMarker.skillLevel, f.skillLevel_min, f.skillLevel_max) && 
          this.state.validTypes[currMarker.type]) {
        tempArr.push(currMarker);
      }
    }
    this.setState({filteredMarkers: tempArr});
  };

  showFilters: (() => Promise<void>) = async () => {
    if (this.state.filterMenu) {this.nullifyFilterMenu(); return;}
    this.nullifySecondaryRatingPanel();
    this.nullifyCommentMenu();
    this.nullifyImageMenu();
    this.nullifyCurrentPOI();
    this.setState({addPOImenu: null});

    let animVal = new Animated.Value(-500);
    filterTypesAnimVal = new Animated.Value(-500);
    this.setState({
      filterMenu: <Animated.View style = {[styles.filterMenuAnimWrap, {top: animVal}]}>
                    {createRangeSlider('Accessibility',
                      value => {this.state.filters.accessibility_min = value; this.changeFilteredList();}, 
                      value => {this.state.filters.accessibility_max = value; this.changeFilteredList();}, 
                      this.state.filters.accessibility_min, this.state.filters.accessibility_max
                    )}

                    {createRangeSlider('Skill Level',
                      value => {this.state.filters.skillLevel_min = value; this.changeFilteredList();}, 
                      value => {this.state.filters.skillLevel_max = value; this.changeFilteredList();}, 
                      this.state.filters.skillLevel_min, this.state.filters.skillLevel_max
                    )}

                    {createRangeSlider('Security',
                      value => {this.state.filters.security_min = value; this.changeFilteredList();}, 
                      value => {this.state.filters.security_max = value; this.changeFilteredList();}, 
                      this.state.filters.security_min, this.state.filters.security_max
                    )}

                    {createRangeSlider('Condition',
                      value => {this.state.filters.condition_min = value; this.changeFilteredList();}, 
                      value => {this.state.filters.condition_max = value; this.changeFilteredList();}, 
                      this.state.filters.condition_min, this.state.filters.condition_max
                    )}
                  </Animated.View>
    });
    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 120}).start();
    Animated.spring(filterTypesAnimVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 350}).start();
  };


  /////////////////////////////////////////////////////////////////////MAIN RENDER///////////////////////////////////////////////////////////////
  render(): any {
    Platform.OS === 'ios' && Constants.statusBarHeight > 40 ? //check if iOS phone has 'notch', set dark/light mode to status bar icons if true
      this.state.darkModeEnabled ? StatusBar.setBarStyle('light-content', true) : StatusBar.setBarStyle('dark-content', true)
    : null;
    
    return (
      <View style = {styles.container}>

        <View style = {{position: 'absolute', left: 0, top: 10, zIndex: 1}}>
          <TouchableOpacity onPress = {this.initBugReport} style = {[FRAME_HEIGHT <= 667 ? {flexDirection: 'row', paddingLeft: 30} : null, {position: 'absolute', top: 40, zIndex: 1}]}> 
            <Image style = {styles.bugReportImg} source = {require('./src/components/reportbug.png')}/>
              <Text
                allowFontScaling = {false}
                style = {{
                  color: this.state.darkModeEnabled ? '#fff' : NEUTRAL_COLOR,
                  fontSize: 11,
                  textAlign: 'center',
                  paddingTop: FRAME_HEIGHT <= 667 ? 5 : 0 //pad text on top on smaller phones (align with image)
                }}
              >
                Give a Suggestion{'\n'}Report a bug
              </Text>
          </TouchableOpacity>
        </View>

        <MapView
          provider = {MapView.PROVIDER_GOOGLE}
          initialRegion = {this.state.regionState}
          zoomEnabled
          zoomTapEnabled //double tap to zoom
          showsCompass
          style = {{flex: 1}}
          customMapStyle = {this.state.darkModeEnabled ? darkMapStyle : []} 
        >
          {this.state.regionState ? <MapView.Marker.Animated //marker condition - checked using ternary expression in render()->return() - displayed if regionState defined
                                      coordinate = {this.state.regionState}
                                      image = {require('./src/components/board.png')}
                                      flat
                                      rotation = {this.state.currentHeading} //rotate according to pulled heading from async tracking func
                                    />
                                  : null}
          
          {this.state.filteredMarkers.map((marker, index) => ( //render markers pulled from RTDB and initialize abstracted activation handler functions
            marker.regionState ? 
            <Marker
              key = {index}
              coordinate = {marker.regionState}
              pinColor = {POS_COLOR}
              onPress = {() => {this.POIactivationHandler(this.state.markers[index])}}
            />
            : null
          ))}

        </MapView>

        {this.state.currentPOI}
        {this.state.currentPOI_images}
        {this.state.currentPOI_comments}

        {this.state.secondaryRatingPanel}
        {this.state.addPOImenu}

        {this.state.filterMenu}
        {this.state.filterMenu ?
          <Animated.View style = {{width: FRAME_WIDTH, height: 50, position: 'absolute', top: filterTypesAnimVal, flexDirection: 'row'}}>   
            {createCheckbox('Ramps:', 
              (checked) => {this.state.validTypes.Ramp = !this.state.validTypes.Ramp; this.changeFilteredList();},
              this.state.validTypes['Ramp']
            )}

            {createCheckbox('Rails:', 
              (checked) => {this.state.validTypes.Rail = !this.state.validTypes.Rail; this.changeFilteredList();},
              this.state.validTypes['Rail']
            )}

            {createCheckbox('Gaps:', 
              (checked) => {this.state.validTypes.Gap = !this.state.validTypes.Gap; this.changeFilteredList();},
              this.state.validTypes['Gap']
            )}

            {createCheckbox('Ledges:', 
              (checked) => {this.state.validTypes.Ledge = !this.state.validTypes.Ledge; this.changeFilteredList();},
              this.state.validTypes['Ledge']
            )}
          </Animated.View>  
        : null}
        

        {this.state.displayPOImenu ?
          <Animated.View style = {[styles.POIdisplay, {bottom: imageButtonAnimVal, backgroundColor: this.state.pendingPOI_image ? POS_COLOR : NEG_COLOR}]}>
            <TouchableOpacity onPress = {this.selectImage} style = {{justifyContent: 'center', height: 31, width: 150, position: 'absolute'}}>
              <Text allowFontScaling = {false} style = {{fontWeight: 'bold', alignSelf: 'center'}}>Add Image</Text>
            </TouchableOpacity>
          </Animated.View>
        : null}

        {this.state.displayPOImenu ? 
          this.state.pendingPOI_image ?
            <Animated.View style = {{position: 'absolute', height: 70, width: 70, bottom: imageSampleAnimVal, left: (FRAME_WIDTH - POI_MENU_DIM)/2 + 165}}>
              <Image
                style = {{position: 'absolute', height: 70, width: 70, resizeMode: 'contain'}}
                source = {{uri: this.state.pendingPOI_image.uri}}
              />
            </Animated.View>
          : 
            <Animated.View style = {{position: 'absolute', height: 80, width: 80, bottom: imageSampleAnimVal, left: (FRAME_WIDTH - POI_MENU_DIM)/2 + 165}}>
              <Image
                style = {{position: 'absolute', height: 80, width: 80, resizeMode: 'contain'}}
                source = {require('./src/components/no-image.png')}
              />
            </Animated.View>
        : null}

        <TouchableOpacity onPress = {this.showFilters} style = {styles.showFiltersButton}>
          <Image
            source = {this.state.darkModeEnabled ? require('./src/components/filters_dm.png') : require('./src/components/filters.png')}
            style = {{resizeMode: 'contain', width: 50, height: 50}}
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress = {this.initiate_addPOI}>
          <Image
            style = {{
              position: 'absolute',
              bottom: .04  * FRAME_HEIGHT,
              left: (FRAME_WIDTH - PLUS_ICON_DIM)/2,
              height: PLUS_ICON_DIM,
              width: PLUS_ICON_DIM,
              resizeMode: 'contain'
            }}
            source = {this.state.darkModeEnabled ?
                        this.state.displayPOImenu ? require('./src/components/dmplus_x.png') : require('./src/components/dmplus.png')
                        :
                        this.state.displayPOImenu ? require('./src/components/plus_x.png') : require('./src/components/plus.png')
                      }
          />
        </TouchableOpacity>

        <TouchableOpacity onPress = {this.darkModeSwitch}>
          <Image 
            style = {styles.DMswitch}
            source = {this.state.darkModeEnabled ? require('./src/components/lm.png') : require('./src/components/dm.png')}
          />
        </TouchableOpacity>

        {this.state.commentInterface}
        {this.state.fullImg}

      </View>
    );
  }
}