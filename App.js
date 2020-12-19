import React, { Component } from "react"; //importing necessary libraries
import { StyleSheet, View, Image, TouchableOpacity, Text, Alert, StatusBar } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Permissions from "expo-permissions";
import { Dimensions } from 'react-native';
import { text } from 'react-native-communications';
import { db } from './src/config';
import { Slider } from 'react-native-range-slider-expo';
import RadioButtonRN from 'radio-buttons-react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

//comments + img/vid addition for poi when marked on map

export default class App extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      APP_WIDTH: Dimensions.get('window').width,
      APP_HEIGHT: Dimensions.get('window').height,
      plusIconDimensions: 144, //height/width of icons in pixels - initialized later - these are fallback values
      darkModeIconDimensions: 57,
      POImenuDimensions: 350,
      bugIconDimensions: 50,
      posColor: '#6cccdc', //blue theme color
      negColor: '#dc6c6c', //red theme color
      neutralColor: '#041c4b', //dark blue theme color
      regionState: null, //carries region lat/lon and corresponding deltas
      didMount: false, //tracks component mount status for processes to eliminate memory leakage
      darkModeEnabled: false,
      displayPOImenu: false,
      pendingPOI_skillLevel: null, //null-define unentered POI states
      pendingPOI_accessibility: null,
      pendingPOI_type: null,
      pendingPOI_condition: null,
      pendingPOI_security: null,
      pendingPOI_image: null,
      markers: [],
      currentPOI: null
    };
  }

  _getLocationAsync = async () => { //location grabber func, operates as a background process (asynchronously)
    this.location = await Location.watchPositionAsync(
      {
        enableHighAccuracy: true,
        distanceInterval: .1, //units of degrees lat/lon
        timeInterval: 100 //updates location every 100ms
      },

      newLocation => { //update location
        let { coords } = newLocation; //save new location found
        let region = {
          latitude: coords.latitude, //rip lat and lon from newLocation var stored in coords
          longitude: coords.longitude,
          latitudeDelta: 0.01, //establish deltas
          longitudeDelta: 0.01
        };
        this.setState({regionState: region}); //push region updates to state struct
      },
    );
    if (!this.state.didMount) {return;} //if component is unmounted, return to avoid tracking location for a defunct process
    return this.location; //otherwise, continue to return new locations every 100ms
  };

  async componentDidMount() { //when component is mounted
    console.log("AW ", this.state.APP_WIDTH);
    console.log("AH ", this.state.APP_HEIGHT);
    this.state.didMount = true; //update state var

    db.ref('/poi').on('value', (snapshot) => {
      this.state.markers = snapshot.val();
      this.state.markers = Object.keys(this.state.markers).map((key) => [String(key), this.state.markers[key]]);
      let markersTemp = []
      for (i = 0; i < this.state.markers.length; i++) {
        markersTemp.push(this.state.markers[i][1]);
      }
      this.state.markers = markersTemp;
    });

    const {status} = await Permissions.askAsync(Permissions.LOCATION); //prompt for location perms

    if (status === "granted") { //verify user response, then begin asynchronous tracking
      this._getLocationAsync();
    } else {
      Alert.alert("You need to allow location permissions for the map to function properly!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.");
    }
    console.log("location perms ", status);
  }

  async componentWillUnmount() {this.state.didMount = false;} //update state (checked for in _getLocationAsync)

  initiate_addPOI = () => { //when "add POI" button is pressed, triggers this function
    if (this.state.pendingPOI_type) {
      console.log(this.state.pendingPOI_type['label']);
    }
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
    text("17085574833", "Bug Report or Suggestion:\n");
  }

  selectImage = async () => {
    const {status} = await Permissions.askAsync(Permissions.CAMERA); //prompt for location perms
    console.log("cam perms ", status);
    if (status !== "granted") {
      Alert.alert("You need to allow camera permissions to take pictures of the cool skate spots you find!\n\nTo change this, visit the Settings app, find this app towards the bottom, and enable.");
    }
    console.log("selecting image");
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [1, 1],
      quality: .5,
      videoMaxDuration: 30
    });

    if (!result.cancelled) {
      this.state.pendingPOI_image = result.uri;
    }
  }

  pushPOIdata = () => {
    if (this.state.pendingPOI_skillLevel != null && this.state.pendingPOI_accessibility != null && this.state.pendingPOI_condition != null
      && this.state.pendingPOI_security != null && this.state.pendingPOI_type && this.state.regionState && this.state.pendingPOI_image) { //verify definition of POI props
      console.log("pushing to RDB");
      db.ref('/poi').push({ //push POI data to directory
        skillLevel: this.state.pendingPOI_skillLevel,
        accessibility: this.state.pendingPOI_accessibility,
        type: this.state.pendingPOI_type,
        condition: this.state.pendingPOI_condition,
        security: this.state.pendingPOI_security,
        regionState: this.state.regionState,
        image: this.state.pendingPOI_image
      });
      this.state.displayPOImenu = false; //withdraw POI menu
      Alert.alert("Your skate spot has been added to the database!😎\n\n(This is monitored and spam entries will be deleted)");
    } else {
      Alert.alert("Please fill out all fields. Remember to select a type and image!😄");
    }
  };

  POIactivationHandler = (poi_obj) => {
    this.state.currentPOI = <View style = {{position: 'absolute', bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions + 10, backgroundColor: '#fff', height: 200, width: this.state.APP_WIDTH}}>

                            </View>
  }

  render() {
    this.state.plusIconDimensions = this.state.APP_WIDTH * .25; //calculate icon dimensions based on app dimensions
    this.state.darkModeIconDimensions = this.state.APP_WIDTH * .15;
    this.state.POImenuDimensions = /*this.state.APP_WIDTH * .8*/330;
    this.state.bugIconDimensions = this.state.APP_WIDTH * .1
    let markerCond = null;
    if (this.state.regionState) {
      markerCond = <Marker //marker condition - checked using ternary expression in render()->return() - displayed if regionState defined
                            coordinate = {this.state.regionState}
                            image = {require('./src/components/board.png')}
                            flat = {true}
                        />
    }
    let POIcond = null;
    let POIcontent = null;
    let POIsubmit = null;
    let POIimageUpload = null;
    if (this.state.displayPOImenu) { //set POI menu to render only if state variable allows
      POIcond = <Image //POI menu bubble image
                  style = {{
                            position: 'absolute',
                            bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions,
                            left: (this.state.APP_WIDTH - this.state.POImenuDimensions)/2,
                            width: this.state.POImenuDimensions,
                            height: /*.5 * this.state.APP_HEIGHT*/448,
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
                        height: .5 * this.state.APP_HEIGHT,
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
                        <Slider min = {0} max = {10} step = {1} //accessibility slider
                          valueOnChange = {value => {this.state.pendingPOI_accessibility = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                        <Text style = {{alignSelf: 'center', fontWeight: 'bold'}}>Accessibility</Text>
                      </View>

                      <View //skillLevel slider wrapper
                        style = {{paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Slider min = {0} max = {10} step = {1} //skillLevel slider
                          valueOnChange = {value => {this.state.pendingPOI_skillLevel = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                        <Text style = {{alignSelf: 'center', fontWeight: 'bold'}}>Skill Level</Text>
                      </View>

                      <View //security slider wrapper
                        style = {{paddingBottom: this.state.APP_HEIGHT * .01, paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Slider min = {0} max = {10} step = {1} //security slider
                          valueOnChange = {value => {this.state.pendingPOI_security = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                        <Text style = {{alignSelf: 'center', fontWeight: 'bold'}}>Security</Text>
                      </View>

                      <View //condition slider wrapper
                        style = {{paddingBottom: this.state.APP_HEIGHT * .01, paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Slider min = {0} max = {10} step = {1} //condition slider
                          valueOnChange = {value => {this.state.pendingPOI_condition = value}}
                          initialValue = {5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                        <Text style = {{alignSelf: 'center', fontWeight: 'bold'}}>Condition</Text>
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
                      <Text style = {{alignSelf: 'center', fontWeight: 'bold', lineHeight: 38, paddingLeft: this.state.POImenuDimensions * .035}}>
                        Ramp{'\n'}Rail{'\n'}Ledge{'\n'}Gap{'\n'}
                      </Text>

                    </View>

      POIimageUpload =  <TouchableOpacity onPress = {this.selectImage}>
                    <Image
                      source = {this.state.pendingPOI_image ? require('./src/components/uploadimg_pos.png') : require('./src/components/uploadimg_neg.png')} //submit button for POI info
                      style = {{
                        position: 'absolute',
                        resizeMode: 'contain',
                        left: this.state.APP_WIDTH/2 + this.state.POImenuDimensions * .04,
                        bottom: this.state.APP_HEIGHT * .2 + this.state.POImenuDimensions * .2,
                        width: this.state.APP_WIDTH * .35
                      }}
                    />
                    <Text 
                      style = {{
                        alignSelf: 'center', 
                        fontWeight: 'bold', 
                        position: 'absolute', 
                        left: this.state.APP_WIDTH/2 + this.state.POImenuDimensions * .12,
                        bottom: this.state.APP_HEIGHT * .2 + this.state.POImenuDimensions * .325
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
                            bottom: this.state.APP_HEIGHT * .22
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

        {this.state.darkModeEnabled ? StatusBar.setBarStyle('light-content', true) : StatusBar.setBarStyle('dark-content', true)}

        <View style = {{position: 'absolute', left: 0, top: 40, zIndex: 1}}>

        <TouchableOpacity onPress = {this.initBugReport}>

          <Image  //bug report button
              style = {{
                height: this.state.bugIconDimensions, //set using previously calculated icon dimensions
                width: this.state.bugIconDimensions,
                resizeMode: 'contain',
                paddingRight: this.state.APP_WIDTH * .3
              }}
              source = {require('./src/components/reportbug.png')}
            />

            <Text //bug report text
              style = {{
                color: this.state.darkModeEnabled ? "#fff" : this.state.neutralColor,
                fontSize: 11,
                textAlign: "center"
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
          
          {this.state.markers.map((marker, index) => (
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
        
        {POIcond /*conditionally render POI menu*/}
        {POIcontent}
        {POIimageUpload}
        {POIsubmit}
        {this.state.currentPOI}

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
            source = {this.state.darkModeEnabled ? require('./src/components/lm.png') : require('./src/components/dm.png')} //ternary identifies proper icon based on mode
          />
        </TouchableOpacity>

      </View>
    );
  }
}

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: "#fff"
  }
});