import React, { Component } from "react"; //importing necessary libraries
import { StyleSheet, View, Image, TouchableOpacity, Text, Alert, StatusBar, Platform } from "react-native";
import { Dimensions } from 'react-native';
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Permissions from "expo-permissions";
import { text } from 'react-native-communications';
import { db } from './src/config';
import { Slider } from 'react-native-range-slider-expo';
import RadioButtonRN from 'radio-buttons-react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';

//comments + img/vid addition for poi when marked on map
//heading direction not updating
//prompt for rating when leaving spot
//about/rules/settings

//icon/splash/etc (icon 1024x1024)
//in app.json, change: name, slug, bundleID (change in firebase as well)

export default class App extends Component {
  
  constructor(props) {
    super(props);
    Text.allowFontScaling = false; // Disallow dynamic type on iOS
    this.state = {
      //dimension reading and proportion fallback determinations
      APP_WIDTH: Dimensions.get('window').width,
      APP_HEIGHT: Dimensions.get('window').height,
      plusIconDimensions: 144, //height/width of icons in pixels - initialized later - these are fallback values
      darkModeIconDimensions: 57,
      POImenuDimensions: 338,
      bugIconDimensions: 50,

      posColor: '#6cccdc', //blue theme color
      negColor: '#dc6c6c', //red theme color
      neutralColor: '#041c4b', //dark blue theme color

      //general main process reference storage
      regionState: null, //carries region lat/lon and corresponding deltas
      didMount: false, //tracks component mount status for processes to eliminate memory leakage
      darkModeEnabled: false,
      displayPOImenu: false,

      //data holds for user inputs awauting RTDB push
      pendingPOI_skillLevel: null, //null-define unentered POI states by default
      pendingPOI_accessibility: null,
      pendingPOI_type: null,
      pendingPOI_condition: null,
      pendingPOI_security: null,
      pendingPOI_image: null,

      //used for database pull (for POIs) on component mount
      markers: [],

      //selected POI display information
      currentPOI: null,
      currentPOIcontent: null,
      currentPOI_exit: null,
      currentPOI_images: null,
      currentPOI_images_exit: null,
      currentPOI_images_content: null
    };

    this.state.plusIconDimensions = this.state.APP_WIDTH * .25; //calculate icon dimensions based on app dimensions
    this.state.darkModeIconDimensions = this.state.APP_WIDTH * .15;
    this.state.bugIconDimensions = this.state.APP_WIDTH * .1
    Text.allowFontScaling = false;
  }

  _getLocationAsync = async () => { //location grabber func, operates as a background process (asynchronously)
    this.location = await Location.watchPositionAsync(
      {
        enableHighAccuracy: true,
        distanceInterval: .1, //units of degrees lat/lon
        timeInterval: 10 //updates location every 100ms
      },

      newLocation => { //update location
        let { coords } = newLocation; //save new location found
        let region = {
          latitude: coords.latitude, //rip lat and lon from newLocation var stored in coords
          longitude: coords.longitude,
          latitudeDelta: 0.01, //establish deltas
          longitudeDelta: 0.01,
          heading: coords.heading
        };
        this.setState({regionState: region}); //push region updates to state struct
      },
    );
    if (!this.state.didMount) {return;} //if component is unmounted, return to avoid tracking location for a defunct process
    return this.location; //otherwise, continue to return new locations every 100ms
  };

  async componentDidMount() { //when component is mounted
    console.log("FW ", this.state.APP_WIDTH); //display frame dimensions in console
    console.log("FH ", this.state.APP_HEIGHT);
    this.state.didMount = true; //update state var
    db.ref('/poi').on('value', (snapshot) => { //pull markers from RTDB
      this.state.markers = snapshot.val();
      this.state.markers = Object.keys(this.state.markers).map((key) => [String(key), this.state.markers[key]]); //map object string identifiers assigned by Firebase to object info
      let markersTemp = []
      for (i = 0; i < this.state.markers.length; i++) { //push POI objects to RTDB
        markersTemp.push(this.state.markers[i][1]);
      }
      this.state.markers = markersTemp;
    });

    const {status} = await Permissions.askAsync(Permissions.LOCATION); //prompt for location perms

    if (status === "granted") { //verify user response, then begin asynchronous tracking
      this._getLocationAsync();
    } else { //reaches if perms denied
      Alert.alert("You need to allow location permissions for the map to function properly!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.");
    }
    console.log("location perms ", status);
  }

  async componentWillUnmount() {this.state.didMount = false;} //update state (checked for in _getLocationAsync)

  initiate_addPOI = () => { //when "add POI" button is pressed, triggers this function
    this.nullifyCurrentPOI(); //remove "current POI" menu/display
    console.log("setting POI to ", !this.state.displayPOImenu);
    this.state.displayPOImenu = !this.state.displayPOImenu; //flip POI menu display state
    this.state.pendingPOI_skillLevel = null, //reset pending POI state variables
    this.state.pendingPOI_accessibility = null;
    this.state.pendingPOI_type = null;
    this.state.pendingPOI_condition = null;
    this.state.pendingPOI_security = null;
    this.state.pendingPOI_image = null;
  }

  darkModeSwitch = () => { //enable dark mode if disabled, and vice versa, called when mode button pressed
    console.log("setting dm to ", !this.state.darkModeEnabled);
    this.state.darkModeEnabled = !this.state.darkModeEnabled;
  }

  initBugReport = () => {
    text("17085574833", "Bug Report or Suggestion:\n"); //prompt with text window/prefilled message
  }

  selectImage = async () => { //triggered by select image button on POI menu
    const {status} = await Permissions.askAsync(Permissions.CAMERA); //prompt for cam perms
    console.log("cam perms ", status);
    if (status !== "granted") { //if perms denied
      Alert.alert("You need to allow camera permissions to take pictures of the cool skate spots you find!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.");
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, //allow photo/video
      allowsEditing: true,
      aspect: [1, 1], //require square crop
      quality: .5,
      videoMaxDuration: 30
    });

    if (!result.cancelled) { //if image submitted
      this.state.pendingPOI_image = result; //capture image and pend to push
    }
  }

  pushPOIdata = async () => { //push pending POI data to the RTDB
    if (this.state.pendingPOI_skillLevel != null && this.state.pendingPOI_accessibility != null && this.state.pendingPOI_condition != null
      && this.state.pendingPOI_security != null && this.state.pendingPOI_type && this.state.regionState && this.state.pendingPOI_image) { //verify definition of POI props
      console.log("pushing to RDB");
      db.ref('/poi').push({ //push POI data to directory
        skillLevel: this.state.pendingPOI_skillLevel,
        accessibility: this.state.pendingPOI_accessibility,
        type: this.state.pendingPOI_type,
        condition: this.state.pendingPOI_condition,
        security: this.state.pendingPOI_security,
        regionState: {latitude: this.state.regionState.latitude, longitude: this.state.regionState.longitude},
        images: [{data: await this.uriToBase64(this.state.pendingPOI_image.uri), type: this.state.pendingPOI_image.type}],//await promise response from helper func, then push base64 return value
        comments: []
      });
      this.state.displayPOImenu = false; //withdraw POI menu
      Alert.alert("Your skate spot has been added to the database!😎 \n\n(This is monitored and spam entries will be deleted)");
    } else {
      Alert.alert("Please fill out all fields. Remember to select a type and image!😄");
    }
  };

  nullifyCurrentPOI = () => {
    this.state.currentPOI = null;
    this.state.currentPOI_exit = null;
    this.state.currentPOIcontent = null;
    this.state.currentPOI_images = null;
    this.state.currentPOI_images_exit = null;
  }

  uriToBase64 = async (uripath) => { //uri to base64 image data conversion
    result = await ImageManipulator.manipulateAsync(uripath, [], {base64: true, compress: .5});
    return result.base64;
  }

  POIactivationHandler = (poi_obj) => { //handles activation of a given POI
    console.log('POI activated; object =>\n');
    console.log(poi_obj);
    this.state.currentPOI = <Image //renders back image for POI display menu
                              source = {require('./src/components/selectedDisplay.png')} //submit button for POI info
                              style = {{resizeMode: 'contain', position: 'absolute', bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 10, height: 200, width: this.state.APP_WIDTH}}
                            />
    this.state.currentPOI_exit =  <TouchableOpacity onPress = {this.nullifyCurrentPOI}>
                                    <Image
                                      source = {require('./src/components/pointDisplay_x.png')} //submit button for POI info
                                      style = {{resizeMode: 'contain', position: 'absolute', bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions - 123, right: 17, width: this.state.APP_WIDTH * .07}}
                                    />
                                  </TouchableOpacity>
    this.state.currentPOIcontent =  <View style = {{position: 'absolute', bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 10, height: 200, width: this.state.APP_WIDTH, flexDirection: 'row'}}>
                                      <View>
                                        <View style = {{flexDirection: 'row', paddingTop: 40, paddingLeft: 10}}>
                                          <Text style = {{fontWeight: 'bold'}}>Accessibility:</Text>
                                          <View style = {{paddingLeft: 10,}}>
                                            <Image
                                              source = {require('./src/components/rating_displayBar.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 100, flexBasis: 20}}
                                            />
                                            <Image
                                              source = {require('./src/components/POIdisplay_indicator.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 10, height: 10, marginLeft: 9 * poi_obj["accessibility"]}}
                                            />
                                          </View>
                                          <Text style = {{fontWeight: 'bold', paddingLeft: 5}}> ({poi_obj["accessibility"]})</Text>
                                        </View>

                                        <View style = {{flexDirection: 'row', paddingLeft: 29}}>
                                          <Text style = {{fontWeight: 'bold'}}>Skill Level:</Text>
                                          <View style = {{paddingLeft: 10,}}>
                                            <Image
                                              source = {require('./src/components/rating_displayBar.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 100, flexBasis: 20}}
                                            />
                                            <Image
                                              source = {require('./src/components/POIdisplay_indicator.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 10, height: 10, marginLeft: 9 * poi_obj["skillLevel"]}}
                                            />
                                          </View>
                                          <Text style = {{fontWeight: 'bold', paddingLeft: 5}}> ({poi_obj["skillLevel"]})</Text>
                                        </View>

                                        <View style = {{flexDirection: 'row', paddingLeft: 30}}>
                                          <Text style = {{fontWeight: 'bold'}}>Condition:</Text>
                                          <View style = {{paddingLeft: 10}}>
                                            <Image
                                              source = {require('./src/components/rating_displayBar.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 100, flexBasis: 20}}
                                            />
                                            <Image
                                              source = {require('./src/components/POIdisplay_indicator.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 10, height: 10, marginLeft: 9 * poi_obj["condition"]}}
                                            />
                                          </View>
                                          <Text style = {{fontWeight: 'bold', paddingLeft: 5}}> ({poi_obj["condition"]})</Text>
                                        </View>

                                        <View style = {{flexDirection: 'row', paddingLeft: 39}}>
                                          <Text style = {{fontWeight: 'bold'}}>Security:</Text>
                                          <View style = {{paddingLeft: 10,}}>
                                            <Image
                                              source = {require('./src/components/rating_displayBar.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 100, flexBasis: 20}}
                                            />
                                            <Image
                                              source = {require('./src/components/POIdisplay_indicator.png')} //submit button for POI info
                                              style = {{resizeMode: 'contain', width: 10, height: 10, marginLeft: 9 * poi_obj["security"]}}
                                            />
                                          </View>
                                          <Text style = {{fontWeight: 'bold', paddingLeft: 8}}>({poi_obj["security"]})</Text>
                                        </View>
                                      </View>

                                      <View>
                                        <TouchableOpacity onPress = {this.enableCurrentPOI_images}>
                                          <Text>IMAGES</Text>
                                        </TouchableOpacity>
                                      </View>

                                    </View>
  }

  enableCurrentPOI_images = () => {
    this.state.currentPOI_images = <Image //renders back image for POI display menu
                              source = {require('./src/components/selectedDisplay.png')} //submit button for POI info
                              style = {{resizeMode: 'contain', position: 'absolute', bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 10 + 200, height: 200, width: this.state.APP_WIDTH}}
                            />
    this.state.currentPOI_images_exit =  <TouchableOpacity onPress = {() => {this.state.currentPOI_images = null; this.state.currentPOI_images_exit = null;}} style = {{width: this.state.APP_WIDTH * .07, position: 'absolute', bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions - 123 + 200, right: 17}}>
                                    <Image
                                      source = {require('./src/components/pointDisplay_x.png')} //submit button for POI info
                                      style = {{resizeMode: 'contain', width: this.state.APP_WIDTH * .07}}
                                    />
                                  </TouchableOpacity>
    this.state.currentPOI_images_content = <View style = {{position: 'absolute', width: this.state.APP_WIDTH, height: 200, bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 10 + 200}}></View>
  }

  render() {
    Platform.OS === 'ios' && Constants.statusBarHeight > 40 ? //check if iOS phone has "notch", set dark/light mode to status bar icons if true
    this.state.darkModeEnabled ? StatusBar.setBarStyle('light-content', true) : StatusBar.setBarStyle('dark-content', true)
    : null

    let markerCond = null; //display marker only if location data has begun to be received
    if (this.state.regionState) {
      markerCond =  <MapView.Marker.Animated //marker condition - checked using ternary expression in render()->return() - displayed if regionState defined
                      coordinate = {this.state.regionState}
                      image = {require('./src/components/board.png')}
                      flat
                      rotation = {this.state.regionState.heading === null ? 0 : this.state.regionState.heading} //rotate according to pulled heading from async tracking func
                    />
    }
    let POIcond = null; //null-def conditional displays
    let POIcontent = null;
    let POIsubmit = null;
    let POIimageUpload = null;
    if (this.state.displayPOImenu) { //set POI menu to render only if state variable allows
      POIcond = <Image //POI menu bubble image
                  style = {{
                            position: 'absolute',
                            bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 7,
                            left: (this.state.APP_WIDTH - this.state.POImenuDimensions)/2,
                            width: this.state.POImenuDimensions,
                            height: /*.5 * this.state.APP_HEIGHT*/452,
                            resizeMode: 'contain'
                          }}
                  source = {require('./src/components/POI_menu.png')}
                />
      const radioTypeData = [ //data for POI menu radio boxes
        {label: 'Ramp'},
        {label: 'Rail'},
        {label: 'Ledge'},
        {label: 'Gap'}
      ];  
      POIcontent =  <View //wrapper view for POI menu content
                      style = {{
                        position: 'absolute',
                        bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions,
                        left: (this.state.APP_WIDTH - this.state.POImenuDimensions)/2,
                        width: this.state.POImenuDimensions,
                        height: 452,
                        flexDirection: 'row', 
                        flexWrap: 'wrap'
                      }}
                    >

                      <View //accessibility slider wrapper
                        style = {{
                          paddingLeft: this.state.POImenuDimensions * .05, 
                          width: this.state.POImenuDimensions * .5, 
                          flexDirection: "column"
                        }}
                      >
                        <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold'}}>Accessibility</Text>

                        <Slider min = {0} max = {10} step = {1} //accessibility slider
                          valueOnChange = {value => {this.state.pendingPOI_accessibility = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                      </View>

                      <View //skillLevel slider wrapper
                        style = {{paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold'}}>Skill Level</Text>

                        <Slider min = {0} max = {10} step = {1} //skillLevel slider
                          valueOnChange = {value => {this.state.pendingPOI_skillLevel = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                      </View>

                      <View //security slider wrapper
                        style = {{paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold'}}>Security</Text>

                        <Slider min = {0} max = {10} step = {1} //security slider
                          valueOnChange = {value => {this.state.pendingPOI_security = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                      </View>

                      <View //condition slider wrapper
                        style = {{paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold'}}>Condition</Text>

                        <Slider min = {0} max = {10} step = {1} //condition slider
                          valueOnChange = {value => {this.state.pendingPOI_condition = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                      </View>
                      <View //divider line after sliders on POI menu
                        style = {{
                          width: this.state.POImenuDimensions,
                          backgroundColor: this.state.neutralColor,
                          height: 1
                        }}
                      >
                      </View>
                      
                      <RadioButtonRN //radio button array
                        style = {{paddingLeft: this.state.POImenuDimensions * .15}}
                        data = {radioTypeData}
                        box = {false}
                        icon = {
                          <Icon //from react-native-vector-icons library
                            name = "check-circle-o"
                            size = {25}
                            color = {this.state.posColor}
                          />
                        }
                        selectedBtn = {(e) => {this.state.pendingPOI_type = e['label']}} //set POI type state variable on radio button select
                        animationTypes = {['pulse', 'rotate']}
                      /> 
                      <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold', lineHeight: 38, paddingLeft: this.state.POImenuDimensions * .035}}>
                        Ramp{'\n'}Rail{'\n'}Ledge{'\n'}Gap{'\n'}
                      </Text>

                    </View>

      POIimageUpload =  <TouchableOpacity onPress = {this.selectImage}>
                    <Image
                      source = {this.state.pendingPOI_image ? require('./src/components/uploadimg_pos.png') : require('./src/components/uploadimg_neg.png')} //submit button for POI info
                      style = {{
                        position: 'absolute',
                        resizeMode: 'contain',
                        left: this.state.APP_HEIGHT <= 667 ? 
                                this.state.APP_WIDTH/2 + this.state.POImenuDimensions * .04 + 5 : this.state.APP_WIDTH/2 + this.state.POImenuDimensions * .04,
                        bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 140,
                        width: this.state.APP_WIDTH * .35
                      }}
                    />
                    <Text 
                      allowFontScaling = {false}
                      style = {{
                        alignSelf: 'center', 
                        fontWeight: 'bold', 
                        position: 'absolute', 
                        left: this.state.APP_WIDTH/2 + this.state.POImenuDimensions * .12,
                        bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 170
                      }}
                    >
                      Select Image
                    </Text>
                  </TouchableOpacity>

      POIsubmit = <TouchableOpacity onPress = {this.pushPOIdata}>  
                        <Image
                          source = {require('./src/components/submitPOI.png')} //submit button for POI info
                          style = {{
                            position: 'absolute',
                            width: this.state.POImenuDimensions * .2,
                            height: this.state.POImenuDimensions * .2,
                            resizeMode: 'contain',
                            left: this.state.APP_WIDTH/2 + this.state.POImenuDimensions * .15,
                            bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + this.state.POImenuDimensions * .2
                          }}
                        />
                      </TouchableOpacity>
    }

    let defaultMapStyle = [] //generate map styles (stored locally)
    let darkMapStyle = [
      {
        "elementType": "geometry",
        "stylers": [{"color": "#242f3e"}]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#746855"}]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#242f3e"}]
      },
      {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#d59563"}]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#d59563"}]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{"color": "#263c3f"}]
      },
      {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#6b9a76"}]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{"color": "#38414e"}]
      },
      {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#212a37"}]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#9ca5b3"}]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{"color": "#746855"}]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#1f2835"}]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#f3d19c"}]
      },
      {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{"color": "#2f3948"}]
      },
      {
        "featureType": "transit.station",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#d59563"}]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{"color": "#17263c"}]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#515c6d"}]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#17263c"}]
      }
    ]
    return (
      <View style = {styles.container}>

        <View style = {{position: 'absolute', left: 0, top: 40, zIndex: 1}}>
          <TouchableOpacity onPress = {this.initBugReport} style = {this.state.APP_HEIGHT <= 667 ? {flexDirection: "row", paddingLeft: 30} : null}> 
            <Image  //bug report image
                style = {{
                  height: this.state.bugIconDimensions, //set using previously calculated icon dimensions
                  width: this.state.bugIconDimensions,
                  resizeMode: 'contain',
                  paddingRight: this.state.APP_HEIGHT <= 667 ? 5 : this.state.APP_WIDTH * .3
                }}
                source = {require('./src/components/reportbug.png')}
              />

              <Text //bug report text
                style = {{
                  color: this.state.darkModeEnabled ? "#fff" : this.state.neutralColor, //change based on mode status
                  fontSize: 11,
                  textAlign: "center",
                  paddingTop: this.state.APP_HEIGHT <= 667 ? 5 : 0 //pad text on top on smaller phones (align with image)
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
          customMapStyle = {this.state.darkModeEnabled ? darkMapStyle : defaultMapStyle} //ternary determines map style based on darkModeEnabled state
        >
          {markerCond /*conditionally render markerCond dependent upon the definition status of regionState*/}
          
          {this.state.markers.map((marker, index) => ( //render markers pulled from RTDB and initialize abstracted activation handler functions
            marker.regionState ? 
            <Marker
              key = {index}
              coordinate = {marker.regionState}
              pinColor = {this.state.posColor}
              onPress = {() => {this.POIactivationHandler(this.state.markers[index])}}
            />
            : null
          ))}

        </MapView>

        {this.state.currentPOI /*conditional POI display/info menu renders*/}
        {this.state.currentPOIcontent}
        {this.state.currentPOI_exit}
        {this.state.currentPOI_images}
        {this.state.currentPOI_images_content}
        {this.state.currentPOI_images_exit}
        
        {POIcond /*conditionally render POI menu*/}
        {POIcontent}
        {POIimageUpload}
        {POIsubmit}

        <TouchableOpacity onPress = {this.initiate_addPOI}>
          <Image  //"add POI" button
            style = {{
              position: 'absolute', //positioned absolutely to play nice with map
              bottom: .04  * this.state.APP_HEIGHT, //4% from bottom of screen
              left: (this.state.APP_WIDTH - this.state.plusIconDimensions)/2, //centered
              height: this.state.plusIconDimensions, //set using previously calculated icon dimensions
              width: this.state.plusIconDimensions,
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
              bottom: .04  * this.state.APP_HEIGHT, //4% from bottom of screen
              left: (this.state.APP_WIDTH - this.state.darkModeIconDimensions) / 2 + .25 * this.state.APP_WIDTH, //centered + 25% of width
              height: this.state.darkModeIconDimensions, //set using previously calculated icon dimensions
              width: this.state.darkModeIconDimensions,
              resizeMode: 'contain'
            }}
            source = {this.state.darkModeEnabled ? require('./src/components/lm.png') : require('./src/components/dm.png')} //ternary identifies proper icon based on current mode
          />
        </TouchableOpacity>

      </View>
    );
  }
}

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: "#000"
  }
});