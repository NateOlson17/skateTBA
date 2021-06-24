import React, { Component } from "react";
import { View, Image, TouchableOpacity, Text, Alert, StatusBar, Platform, FlatList, Animated, TextInput } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Permissions from "expo-permissions";
import { text } from 'react-native-communications';
import { db } from './src/config';
import RangeSlider from 'react-native-range-slider-expo';
import RadioButtonRN from 'radio-buttons-react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import CircleCheckBox, {LABEL_POSITION} from 'react-native-circle-checkbox';
import { showLocation } from 'react-native-map-link';
import { FlingGestureHandler, State, Directions } from 'react-native-gesture-handler';
import Clipboard from 'expo-clipboard';

import { createIconSetFromFontello } from 'react-native-vector-icons';
import fontelloConfig from './src/fonts/config.json';
const Icon = createIconSetFromFontello(fontelloConfig);
import * as Font from 'expo-font';
import { darkMapStyle, POS_COLOR, NEG_COLOR, NEUTRAL_COLOR, FRAME_WIDTH, FRAME_HEIGHT, PLUS_ICON_DIM, DM_ICON_DIM, POI_MENU_DIM } from "./src/constants";
import { createSlider, createRatingBar, createCurrentPOIAction } from "./src/componentCreation";
import { styles } from './src/styles.js'

//images to rounded divs
//file organization/separation
//enforce types
//eslint
//clean node_modules

//settings/info
//filter types
//clean up code from filtering onwards
//cache images?

//add star rating or allow users to change ratings? otherwise one user sets ratings forever
//prompt for rating when leaving area
//add video support
//widget that shows surrounding points
//app rating prompts
//haptics/3d touch (which models?)
//icon/splash/etc (icon 1024x1024)
//make sure permissions dont break the app
//test different ios versions
//shake to refresh

let imageButtonAnimVal = new Animated.Value(-500);
let imageSampleAnimVal = new Animated.Value(-500);
let filterTypesAnimVal = new Animated.Value(-500);

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      //general main process dynamic reference storage

      regionState: null, //carries region lat/lon and corresponding deltas
      currentHeading: 0,
      didMount: false, //tracks component mount status for processes to eliminate memory leakage
      darkModeEnabled: false,
      displayPOImenu: false,

      //data holds for user inputs awaiting RTDB push
      pendingPOI_skillLevel: null, //null-define unentered POI states by default
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
      addPOImenu: null, //POI addition menu

      commentInterface: null,
      ipComment: "",
      
      fullImg: null,

      //filter menu display
      filterMenu: null,
      condition_min: 0, condition_max: 10, security_min: 0, security_max: 10, 
      skillLevel_min: 0, skillLevel_max: 10, accessibility_min: 0, accessibility_max: 10,
      validTypes: {"Ramp": true, "Rail": true, "Ledge": true, "Gap": true}
    };
  }


  /////////////////////////////////////////////////LOCATION AND MOUNT TASKS///////////////////////////////////////////////////////////////////////

  _getLocationAsync = async () => { //location grabber func, operates as a background process (asynchronously)
    if (!this.state.didMount) {return;} //if component is unmounted, return to avoid tracking for a defunct process
    this.location = await Location.watchPositionAsync(
      { //options
        enableHighAccuracy: true,
        distanceInterval: .1, //units of degrees lat/lon
        timeInterval: 100 //updates location every 100ms
      },
      newLocation => { //"on event refresh" function
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

  componentDidMount = async () => { //when main component is mounted
    console.log("FW =>", FRAME_WIDTH); //display frame dimensions in console (UIkit sizes, not true pixel)
    console.log("FH =>", FRAME_HEIGHT);
    this.setState({didMount: true}); //update state var to indicate mount
    
    db.ref('/poi').on('value', (snapshot) => { //pull snapshot from RTDB
      let markersTemp = snapshot.val(); //capture snapshot values
      markersTemp = Object.keys(markersTemp).map((key) => [String(key), markersTemp[key]]); //map object string identifiers assigned by Firebase to object info
      this.setState({markers: []});
      for (i = 0; i < markersTemp.length; i++) { //iterate through the remapped snapshot
        markersTemp[i][1].id = markersTemp[i][0]; //use FB-assigned string identifiers as object properties (id)
        this.state.markers.push(markersTemp[i][1]); //push object from remap to markers state var
      }
      this.setState({filteredMarkers: this.state.markers}) //update filtered list to match full marker list
    });

    const {status} = await Permissions.askAsync(Permissions.LOCATION); //prompt for location perms
    if (status === "granted") { //verify user response, then begin asynchronous tracking
      this._getLocationAsync();
    } else { //reaches if perms denied
      Alert.alert("You need to allow location permissions for the map to function properly!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.");
    }
    console.log("location perms", status);

    await Font.loadAsync({fontello: require('./src/fonts/fontello.ttf')});
  };

  componentWillUnmount = () => {this.setState({didMount: false})}; //update state (checked for in _getLocationAsync)





 ///////////////////////////////////////////////////POI Addition, Bug Reports, & Mode Switching/////////////////////////////////////////////////////////////////

  initiate_addPOI = () => {
    this.nullifyCurrentPOI();
    this.setState({filterMenu: null, pendingPOI_image: null, pendingPOI_type: null}); //remove filter menu, reset pending image and type data
    this.setState({displayPOImenu: !this.state.displayPOImenu});
    
    if (this.state.displayPOImenu) {this.setState({addPOImenu: null}); return;} //if POI addition menu is already visible, nullify it
    let animVal = new Animated.Value(-500);
    imageButtonAnimVal = new Animated.Value(-500);
    imageSampleAnimVal = new Animated.Value(-500);
    this.setState({
      addPOImenu: <Animated.View style = {[styles.POIAdditionWrapper, {bottom: animVal}]}>
                    <Image style = {styles.POIAdditionBG} source = {require('./src/components/POI_menu.png')}/>

                    {createSlider(value => {this.setState({pendingPOI_accessibility: value});}, 5, 'Accessibility')}
                    {createSlider(value => {this.setState({pendingPOI_skillLevel: value});}, 5, 'Skill Level')}
                    {createSlider(value => {this.setState({pendingPOI_security: value});}, 5, 'Security')}
                    {createSlider(value => {this.setState({pendingPOI_condition: value});}, 5, 'Condition')}

                    <View style = {{width: POI_MENU_DIM, backgroundColor: NEUTRAL_COLOR, height: 1}}/*divider line*//>
                    
                    <RadioButtonRN
                      style = {{paddingLeft: POI_MENU_DIM * .15}}
                      data = {[{label: 'Ramp'}, {label: 'Rail'}, {label: 'Ledge'}, {label: 'Gap'}]}
                      box = {false}
                      icon = {<Icon name = "boy-on-skateboard-silhouette" size = {25} color = {POS_COLOR}/>}
                      selectedBtn = {(e) => {this.state.pendingPOI_type = e.label}}
                      animationTypes = {['pulse', 'rotate']}
                    /> 

                    <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold', lineHeight: 38, paddingLeft: POI_MENU_DIM * .035}}>
                      Ramp{'\n'}Rail{'\n'}Ledge{'\n'}Gap{'\n'}
                    </Text>

                    <TouchableOpacity onPress = {this.pushPOIdata} style = {{position: 'absolute', top: 300, right: 20, width: POI_MENU_DIM * .2, height: POI_MENU_DIM * .2}}>  
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

  darkModeSwitch = () => {this.setState({darkModeEnabled: !this.state.darkModeEnabled});}

  initBugReport = () => {text("17085574833", "Bug Report or Suggestion:\n");}

  pushPOIdata = async () => {
    if (this.state.pendingPOI_type && this.state.regionState && this.state.pendingPOI_image) {
      console.log("pushing to RTDB");
      db.ref('/poi').push({ //push POI data to directory
        skillLevel: this.state.pendingPOI_skillLevel,
        accessibility: this.state.pendingPOI_accessibility,
        type: this.state.pendingPOI_type,
        condition: this.state.pendingPOI_condition,
        security: this.state.pendingPOI_security,
        regionState: {latitude: this.state.regionState.latitude, longitude: this.state.regionState.longitude},
        images: [{key: "0", data: await this.uriToBase64(this.state.pendingPOI_image.uri), type: this.state.pendingPOI_image.type}],//await promise response from helper func, then push base64 return value
      });
      this.setState({displayPOImenu: false, addPOImenu: null});
      Alert.alert("Your skate spot has been added to the database!😎 \n\n(This is monitored and spam entries will be deleted)");
    } else {
      Alert.alert("Please fill out all fields. Remember to select a type and image!😄");
    }
  };

  uriToBase64 = async uripath => { //uri to base64 image data conversion helper func
    result = await ImageManipulator.manipulateAsync(uripath, [], {base64: true, compress: .4, format: ImageManipulator.SaveFormat.JPEG});
    return result.base64;
  };

  selectImage = async () => { //triggered by select image button on POI addition menu
    const {status} = await Permissions.askAsync(Permissions.CAMERA);
    console.log("cam perms", status);
    if (status !== "granted") { //if perms denied
      Alert.alert("You need to allow camera permissions to take pictures of the cool skate spots you find!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable."); return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, //allow photos
      allowsEditing: true,
      aspect: [1, 1], //require square crop
      quality: .5,
    });

    if (!result.cancelled) { //if image submitted
      this.setState({pendingPOI_image: result});
    }
  };


  //////////////////////////////////////////////////////////////POI Viewing & Image/Comment Addition/////////////////////////////////////////////////////////////////////////////

  nullifyCurrentPOI = () => {this.setState({currentPOI: null, currentPOI_images: null, currentPOI_comments: null});} //helper functions to get rid of unneeded menu renders

  nullifyImageMenu = () => {this.setState({currentPOI_images: null});}

  nullifyCommentMenu = () => {this.setState({currentPOI_comments: null});}

  POIactivationHandler = poi_obj => { //handles activation of a given POI
    console.log('POI activated; id =>', poi_obj.id);
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
                          setTimeout(() => {
                            this.nullifyCurrentPOI();
                          }, 200);
                      }
                  }}>
                    <Animated.View style = {[styles.currentPOIWrapper, {bottom: viewAnim}]}>
                      <Image source = {require('./src/components/gestureBar.png')} style = {styles.gestureBar}/>

                      <View style={{paddingTop: 40}}>
                        {createRatingBar(poi_obj, 'accessibility', 'Accessibility:', accessibilityIndicatorLM, 10)}
                        {createRatingBar(poi_obj, 'skillLevel', 'Skill Level:', skillLevelIndicatorLM, 29)}
                        {createRatingBar(poi_obj, 'condition', 'Condition:', conditionIndicatorLM, 30)}
                        {createRatingBar(poi_obj, 'security', 'Security:', securityIndicatorLM, 39)}
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
                        <Image
                          source = {require('./src/components/pointDisplay_x.png')}
                          style = {styles.POIexit_generic}
                        />
                      </TouchableOpacity>

                    </Animated.View>
                  </FlingGestureHandler>
    });
    Animated.spring(viewAnim, {useNativeDriver: false, friction: 5, tension: 4, toValue: FRAME_HEIGHT * .04 + PLUS_ICON_DIM + 10}).start();
    setTimeout(() => {
      Animated.spring(accessibilityIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj["accessibility"]}).start();
      Animated.spring(conditionIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj["condition"]}).start();
      Animated.spring(skillLevelIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj["skillLevel"]}).start();
      Animated.spring(securityIndicatorLM, {useNativeDriver: false, friction: 2, tension: 4, toValue: 9 * poi_obj["security"]}).start();
    }, 300);
  };

  enableCurrentPOI_images = poi_obj => {
    console.log("displaying images");
    this.nullifyCommentMenu();
    this.setState({filterMenu: null});

    let animVal = new Animated.Value(2 * FRAME_HEIGHT);
    this.setState({
      currentPOI_images:  <FlingGestureHandler //handles swipe-down
                            direction = {Directions.DOWN}
                            onHandlerStateChange={({ nativeEvent }) => {
                              if (nativeEvent.state === State.ACTIVE) {
                                Animated.timing(animVal, {useNativeDriver: false, toValue: 2 * FRAME_HEIGHT}).start(); //animates swipe-down
                                  setTimeout(() => {
                                    this.setState({currentPOI_images: null}); //after 100ms delay, nullify images panel
                                  }, 100);
                              }
                          }}>
                            <Animated.View style = {{position: 'absolute', width: FRAME_WIDTH, height: FRAME_HEIGHT, top: animVal, zIndex: 0}}>
                              <View style = {styles.POIdisplayAdditionalMenu_ContentWrapper}>
                                <Image //renders back image for POI image display menu
                                  source = {require('./src/components/selectedDisplay.png')} 
                                  style = {{resizeMode: 'contain', position: 'absolute',  height: 200, width: FRAME_WIDTH}}
                                />

                                <Image //renders gesture indicator bar
                                  source = {require('./src/components/gestureBar.png')}
                                  style = {styles.gestureBar}
                                />

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
                                  <Image
                                    source = {require('./src/components/pointDisplay_x.png')}
                                    style = {styles.POIexit_generic}
                                  />
                                </TouchableOpacity>
                              </View>
                            </Animated.View>
                          </FlingGestureHandler>
    });
    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 0}).start(); //animate menu slide-in
  };

  displayFullsizeImage = img => {//display fullscreen image with swipe-down handler (no animation)
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

  addPOIimage = async poi_obj => {
    console.log("adding image");

    let currentImages = poi_obj.images;
    let imageTemp = null; //used to hold new image data
    const { status } = await Permissions.askAsync(Permissions.CAMERA); //prompt for cam perms
    console.log("cam perms", status);
    if (status !== "granted") { //if perms denied
      Alert.alert("You need to allow camera permissions to take pictures of the cool skate spots you find!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable."); return;
    }

    let addResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, //allow photo/video
      allowsEditing: true,
      aspect: [1, 1], //require square crop
      quality: .5,
      videoMaxDuration: 30
    });

    if (!addResult.cancelled) { //if image submitted
      imageTemp = {key: currentImages.length.toString(), data: await this.uriToBase64(addResult.uri), type: addResult.type}; //capture image and pend to push
    }
    currentImages.push(imageTemp); 

    db.ref(`/poi/${poi_obj.id}`).update({images: currentImages});
  };

  enableCurrentPOI_comments = poi_obj => {
    console.log("displaying comments");
    this.nullifyImageMenu();
    this.setState({filterMenu: null});

    let animVal = new Animated.Value(2 * FRAME_HEIGHT);
    this.setState({
      currentPOI_comments:  <FlingGestureHandler
                              direction = {Directions.DOWN}
                              onHandlerStateChange={({ nativeEvent }) => {
                                if (nativeEvent.state === State.ACTIVE) {
                                  Animated.timing(animVal, {useNativeDriver: false, toValue: 2 * FRAME_HEIGHT}).start(); //swipe-down animation
                                  setTimeout(() => {
                                    this.setState({currentPOI_comments: null}); //delay to present animation, then nullify
                                  }, 100);
                                }
                            }}>
                              <Animated.View style = {{position: 'absolute', width: FRAME_WIDTH, height: FRAME_HEIGHT, top: animVal}}>
                                <View style = {styles.POIdisplayAdditionalMenu_ContentWrapper}>
                                  <Image //renders back image for POI display menu
                                    source = {require('./src/components/selectedDisplay.png')}
                                    style = {styles.POIdisplayBG}
                                  />

                                  <Image //renders gesture indicator bar
                                    source = {require('./src/components/gestureBar.png')}
                                    style = {styles.gestureBar}
                                  />

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
                                    <Text allowFontScaling = {false} style = {{alignSelf: "center"}}>NO COMMENTS</Text>
                                  }

                                  <TouchableOpacity onPress = {() => {this.nullifyCommentMenu()}} style = {styles.POIexit_TO}>
                                    <Image
                                      source = {require('./src/components/pointDisplay_x.png')} 
                                      style = {styles.POIexit_generic}
                                    />
                                  </TouchableOpacity>
                                </View>
                              </Animated.View>
                            </FlingGestureHandler>
    });
    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 0}).start(); //appearance animation
  };

  addPOIcomment = poi_obj => {
    console.log("adding comment");
    this.nullifyCurrentPOI();
    this.setState({filterMenu: null});

    this.setState({
      ipComment: '',
      commentInterface: <View style = {{position: 'absolute', height: FRAME_HEIGHT, width: FRAME_WIDTH, backgroundColor: 'rgba(255, 255, 255, 0.8)'}}>
                          <TouchableOpacity onPress = {() => {this.setState({commentInterface: null});}} style = {{position: 'absolute', height: FRAME_WIDTH * .07, width: FRAME_WIDTH * .07, top: 60, right: 50}}>
                            <Image
                              source = {require('./src/components/pointDisplay_x.png')}
                              style = {styles.POIexit_generic}
                            />
                          </TouchableOpacity>

                          <TextInput style = {{position: "absolute", left: FRAME_WIDTH / 2 - 50, bottom: FRAME_HEIGHT / 4, width: 100, height: 300}}
                              allowFontScaling = {false}
                              placeholder = "Say something about this spot!"
                              placeholderTextColor = {POS_COLOR}
                              maxLength = {100}
                              clearButtonMode = 'while-editing'
                              multiline
                              textAlign = 'center'
                              onChangeText = {(text) => this.setState({ipComment: text})}
                            />

                          <TouchableOpacity onPress = {() => {this.POIcommentSubmissionHandler(poi_obj)}} style = {{position: 'absolute', height: FRAME_WIDTH * .07, width: FRAME_WIDTH * .07, top: 60, right: 80}}>
                            <Image
                              source = {require('./src/components/submitComment.png')}
                              style = {styles.POIexit_generic}
                            />
                          </TouchableOpacity>
                        </View>
    });
  };

  POIcommentSubmissionHandler = poi_obj => {
    console.log("submitting comment");
    if (!this.state.ipComment) {return;} //if comment empty, ignore
    this.setState({commentInterface: null});
    let currentComments = poi_obj.comments ? poi_obj.comments : []; //if the comments list exists, use it, otherwise use an empty array
    currentComments.push({key: currentComments.length.toString(), text: this.state.ipComment})
    db.ref(`/poi/${poi_obj.id}`).update({comments: currentComments});
  }

  initiateNavigation = poi_obj => {
    console.log("navigating");
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

  sharePOIurl = poi_obj => {
    const POIurl = `maps.google.com/maps?q=${poi_obj.regionState.latitude},${poi_obj.regionState.longitude}`;
    console.log("sharing POI", POIurl);
    Clipboard.setString(POIurl);
    Alert.alert("Link copied to clipboard.");
  }



  ////////////////////////////////////////////////////////////////Filtering///////////////////////////////////////////////////////////////////

  changeFilteredList = (condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, validTypes) => {
    console.log("updating filters");

    this.setState({condition_min: condition_min, condition_max: condition_max, security_min: security_min, security_max: security_max, accessibility_max: accessibility_max, accessibility_min: accessibility_min, skillLevel_max: skillLevel_max, skillLevel_min: skillLevel_min, validTypes: validTypes});
    let tempArr = [];
    for (i = 0; i < this.state.markers.length; i++) {
      let currMarker = this.state.markers[i];
      if (currMarker.condition <= condition_max && currMarker.condition >= condition_min && currMarker.security <= security_max 
          && currMarker.security >= security_min && currMarker.accessibility <= accessibility_max && currMarker.accessibility >= accessibility_min 
          && currMarker.skillLevel <= skillLevel_max && currMarker.skillLevel >= skillLevel_min && validTypes[currMarker.type]) {
        tempArr.push(currMarker);
      }
    }
    this.setState({filteredMarkers: tempArr});
    console.log(condition_min, condition_max, security_min, security_max, accessibility_min, accessibility_max, skillLevel_min, skillLevel_max, validTypes);
  };

  showFilters = async () => {
    console.log("showing filters");
    if (this.state.filterMenu) {this.setState({filterMenu: null}); return;}
    this.setState({currentPOI_comments: null, currentPOI_images: null, addPOImenu: null, displayPOImenu: null});
    let condition_min = this.state.condition_min; let condition_max = this.state.condition_max;
    let security_min = this.state.security_min; let security_max = this.state.security_max;
    let skillLevel_min = this.state.skillLevel_min; let skillLevel_max = this.state.skillLevel_max;
    let accessibility_min = this.state.accessibility_min; let accessibility_max = this.state.accessibility_max;

    let animVal = new Animated.Value(-500);
    filterTypesAnimVal = new Animated.Value(-500);
    this.setState({
      filterMenu: <Animated.View style = {{height: 300, width: FRAME_WIDTH, position: 'absolute', top: animVal, flexDirection: 'row', flexWrap: 'wrap'}}>

                    <Image
                      source = {require('./src/components/selectedDisplay.png')}
                      style = {{position: 'absolute', resizeMode: 'stretch', height: 300, width: FRAME_WIDTH}}
                    />

                    <View style = {{width: FRAME_WIDTH / 2, alignItems: 'center', marginTop: 10}}>
                      <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>Accessibility</Text>
                      <RangeSlider min = {0} max = {10}
                        styleSize = 'small'
                        fromValueOnChange = {value => {accessibility_min = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        toValueOnChange = {value => {accessibility_max = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        initialFromValue = {accessibility_min}
                        initialToValue = {accessibility_max}
                        
                        fromKnobColor = {NEUTRAL_COLOR}
                        toKnobColor = {NEUTRAL_COLOR}
                        inRangeBarColor = {POS_COLOR}
                        outOfRangeBarColor = {NEG_COLOR}
                      />
                    </View>

                    <View style = {{width: FRAME_WIDTH / 2, alignItems: 'center', marginTop: 10}}>
                      <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>Skill Level</Text>
                      <RangeSlider min = {0} max = {10}
                        styleSize = 'small'
                        fromValueOnChange = {value => {skillLevel_min = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        toValueOnChange = {value => {skillLevel_max = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        initialFromValue = {skillLevel_min}
                        initialToValue = {skillLevel_max}

                        fromKnobColor = {NEUTRAL_COLOR}
                        toKnobColor = {NEUTRAL_COLOR}
                        inRangeBarColor = {POS_COLOR}
                        outOfRangeBarColor = {NEG_COLOR}
                      />
                    </View>
                    
                    <View style = {{width: FRAME_WIDTH / 2, alignItems: 'center'}}>
                      <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>Security</Text>
                      <RangeSlider min = {0} max = {10}
                        styleSize = 'small'
                        fromValueOnChange = {value => {security_min = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        toValueOnChange = {value => {security_max = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        initialFromValue = {security_min}
                        initialToValue = {security_max}
                        
                        fromKnobColor = {NEUTRAL_COLOR}
                        toKnobColor = {NEUTRAL_COLOR}
                        inRangeBarColor = {POS_COLOR}
                        outOfRangeBarColor = {NEG_COLOR}
                      />
                    </View>

                    <View style = {{width: FRAME_WIDTH / 2, alignItems: 'center'}}>
                      <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>Condition</Text>
                      <RangeSlider min = {0} max = {10}
                        styleSize = 'small'
                        fromValueOnChange = {value => {condition_min = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        toValueOnChange = {value => {condition_max = value; this.changeFilteredList(condition_min, condition_max, security_min, security_max, skillLevel_min, skillLevel_max, accessibility_min, accessibility_max, this.state.validTypes);}}
                        initialFromValue = {condition_min}
                        initialToValue = {condition_max}
                        
                        fromKnobColor = {NEUTRAL_COLOR}
                        toKnobColor = {NEUTRAL_COLOR}
                        inRangeBarColor = {POS_COLOR}
                        outOfRangeBarColor = {NEG_COLOR}
                      />
                    </View>

                  </Animated.View>
    });
    Animated.spring(animVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 120}).start();
    Animated.spring(filterTypesAnimVal, {useNativeDriver: false, friction: 5, tension: 4, toValue: 350}).start();
  };

















  /////////////////////////////////////////////////////////////////////MAIN RENDER///////////////////////////////////////////////////////////////

  render() {
    Platform.OS === 'ios' && Constants.statusBarHeight > 40 ? //check if iOS phone has "notch", set dark/light mode to status bar icons if true
      this.state.darkModeEnabled ? StatusBar.setBarStyle('light-content', true) : StatusBar.setBarStyle('dark-content', true)
    : null;
    
    return (
      <View style = {styles.container}>

        <View style = {{position: 'absolute', left: 0, top: 40, zIndex: 1}}>
          <TouchableOpacity onPress = {this.initBugReport} style = {FRAME_HEIGHT <= 667 ? {flexDirection: "row", paddingLeft: 30} : null}> 
            <Image  //bug report image
                style = {{
                  height: FRAME_WIDTH * .1, //set using previously calculated icon dimensions
                  width: FRAME_WIDTH * .1,
                  resizeMode: 'contain',
                  paddingRight: FRAME_HEIGHT <= 667 ? 5 : FRAME_WIDTH * .3
                }}
                source = {require('./src/components/reportbug.png')}
              />

              <Text //bug report text
                allowFontScaling = {false}
                style = {{
                  color: this.state.darkModeEnabled ? "#fff" : NEUTRAL_COLOR, //change based on mode status
                  fontSize: 11,
                  textAlign: "center",
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
          style = {{flex: 1}} //fill parent
          customMapStyle = {this.state.darkModeEnabled ? darkMapStyle : []} //ternary determines map style based on darkModeEnabled state
        >
          {this.state.regionState ? <MapView.Marker.Animated //marker condition - checked using ternary expression in render()->return() - displayed if regionState defined
                                      coordinate = {this.state.regionState}
                                      image = {require('./src/components/board.png')}
                                      flat
                                      rotation = {this.state.currentHeading} //rotate according to pulled heading from async tracking func
                                    />
                                  : null/*conditionally render markerCond dependent upon the definition status of regionState*/}
          
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

        {this.state.currentPOI /*conditional POI display/info menu renders*/}
        {this.state.currentPOI_images}
        {this.state.currentPOI_comments}

        {this.state.addPOImenu}

        {this.state.filterMenu}
        {this.state.filterMenu ?
          <Animated.View style = {{width: FRAME_WIDTH, height: 50, position: 'absolute', top: filterTypesAnimVal, flexDirection: 'row'}}>
            <CircleCheckBox
            styleCheckboxContainer = {{paddingLeft: 20}}
            allowFontScaling = {false}
            checked = {this.state.validTypes["Ramp"]}
            onToggle = {(checked) => {let newValid = this.state.validTypes; newValid["Ramp"] = !newValid["Ramp"]; this.changeFilteredList(this.state.condition_min, this.state.condition_max, this.state.security_min, this.state.security_max, this.state.skillLevel_min, this.state.skillLevel_max, this.state.accessibility_min, this.state.accessibility_max, newValid);}}
            label = "Ramps:"
            labelPosition={LABEL_POSITION.LEFT}
            styleLabel = {{fontWeight: 'bold'}}
            outerColor = {POS_COLOR}
            innerColor = {POS_COLOR}
            />
            <CircleCheckBox
            styleCheckboxContainer = {{paddingLeft: 10}}
            allowFontScaling = {false}
            checked = {this.state.validTypes["Rail"]}
            onToggle = {(checked) => {let newValid = this.state.validTypes; newValid["Rail"] = !newValid["Rail"]; this.changeFilteredList(this.state.condition_min, this.state.condition_max, this.state.security_min, this.state.security_max, this.state.skillLevel_min, this.state.skillLevel_max, this.state.accessibility_min, this.state.accessibility_max, newValid);}}
            label = "Rails:"
            labelPosition={LABEL_POSITION.LEFT}
            styleLabel = {{fontWeight: 'bold'}}
            outerColor = {POS_COLOR}
            innerColor = {POS_COLOR}
            />
            <CircleCheckBox
            styleCheckboxContainer = {{paddingLeft: 10}}
            allowFontScaling = {false}
            checked = {this.state.validTypes["Gap"]}
            onToggle = {(checked) => {let newValid = this.state.validTypes; newValid["Gap"] = !newValid["Gap"]; this.changeFilteredList(this.state.condition_min, this.state.condition_max, this.state.security_min, this.state.security_max, this.state.skillLevel_min, this.state.skillLevel_max, this.state.accessibility_min, this.state.accessibility_max, newValid);}}
            label = "Gaps:"
            labelPosition={LABEL_POSITION.LEFT}
            styleLabel = {{fontWeight: 'bold'}}
            outerColor = {POS_COLOR}
            innerColor = {POS_COLOR}
            />
            <CircleCheckBox
            styleCheckboxContainer = {{paddingLeft: 10}}
            allowFontScaling = {false}
            checked = {this.state.validTypes["Ledge"]}
            onToggle = {(checked) => {let newValid = this.state.validTypes; newValid["Ledge"] = !newValid["Ledge"]; this.changeFilteredList(this.state.condition_min, this.state.condition_max, this.state.security_min, this.state.security_max, this.state.skillLevel_min, this.state.skillLevel_max, this.state.accessibility_min, this.state.accessibility_max, newValid);}}
            label = "Ledges:"
            labelPosition={LABEL_POSITION.LEFT}
            styleLabel = {{fontWeight: 'bold'}}
            outerColor = {POS_COLOR}
            innerColor = {POS_COLOR}
            />
          </Animated.View>  
        : null}
        

        {this.state.displayPOImenu ? //conditionally render add image button (to refresh at maximum rate)
          <Animated.View style = {{position: "absolute", bottom: imageButtonAnimVal, left: (FRAME_WIDTH - POI_MENU_DIM)/2 + 160, height: 31, width: 150}}>
            <TouchableOpacity onPress = {this.selectImage} style = {{justifyContent: 'center', height: 31, width: 150, position: "absolute"}}>
              <Image
                source = {this.state.pendingPOI_image ? require('./src/components/uploadimg_pos.png') : require('./src/components/uploadimg_neg.png')} 
                style = {{
                  resizeMode: 'contain',
                  width: 150,
                  position: 'absolute',
                }}
              />
              <Text allowFontScaling = {false} style = {{fontWeight: 'bold', alignSelf: 'center'}}>Add Image</Text>
            </TouchableOpacity>
          </Animated.View>
          : null}
        {this.state.displayPOImenu ? 
          this.state.pendingPOI_image ?
            <Animated.View style = {{position: "absolute", height: 70, width: 70, bottom: imageSampleAnimVal, left: (FRAME_WIDTH - POI_MENU_DIM)/2 + 165}}>
              <Image //selected image
                style = {{position: "absolute", height: 70, width: 70, resizeMode: 'contain'}}
                source = {{uri: this.state.pendingPOI_image.uri}}
              />
            </Animated.View>
          : 
            <Animated.View style = {{position: "absolute", height: 80, width: 80, bottom: imageSampleAnimVal, left: (FRAME_WIDTH - POI_MENU_DIM)/2 + 165}}>
              <Image //no image
                style = {{position: "absolute", height: 80, width: 80, resizeMode: 'contain'}}
                source = {require('./src/components/no-image.png')}
              />
            </Animated.View>
        : null}

        <TouchableOpacity onPress = {this.showFilters} style = {{position: 'absolute', bottom: FRAME_HEIGHT * .04 + 20, left: (FRAME_WIDTH - 40) / 2 - FRAME_WIDTH * .25, width: 40, height: 40}}>
          <Image
            source = {this.state.darkModeEnabled ? require('./src/components/filters_dm.png') : require('./src/components/filters.png')}
            style = {{resizeMode: 'contain', width: 50, height: 50}}
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress = {this.initiate_addPOI}>
          <Image  //"add POI" button
            style = {{
              position: 'absolute', //positioned absolutely to play nice with map
              bottom: .04  * FRAME_HEIGHT, //4% from bottom of screen
              left: (FRAME_WIDTH - PLUS_ICON_DIM)/2, //centered
              height: PLUS_ICON_DIM, //set using previously calculated icon dimensions
              width: PLUS_ICON_DIM,
              resizeMode: 'contain'
            }}
            source = {this.state.darkModeEnabled ?
                        this.state.displayPOImenu ? require('./src/components/dmplus_x.png') : require('./src/components/dmplus.png')
                        :
                        this.state.displayPOImenu ? require('./src/components/plus_x.png') : require('./src/components/plus.png')
                      } //ternary to determine icon based on dark mode and POI menu statuses
          />
        </TouchableOpacity>

        <TouchableOpacity onPress = {this.darkModeSwitch}>
          <Image  //"mode" button
            style = {{
              position: 'absolute', //positioned absolutely to play nice with map
              bottom: .04  * FRAME_HEIGHT, //4% from bottom of screen
              left: (FRAME_WIDTH - DM_ICON_DIM) / 2 + .25 * FRAME_WIDTH, //centered + 25% of width
              height: DM_ICON_DIM, //set using previously calculated icon dimensions
              width: DM_ICON_DIM,
              resizeMode: 'contain'
            }}
            source = {this.state.darkModeEnabled ? require('./src/components/lm.png') : require('./src/components/dm.png')} //ternary identifies proper icon based on current mode
          />
        </TouchableOpacity>

        {this.state.commentInterface}
        {this.state.fullImg}

      </View>
    );
  }
}