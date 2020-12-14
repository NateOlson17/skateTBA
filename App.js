import React, { Component } from "react"; //importing necessary libraries
import { StyleSheet, View, Image, TouchableOpacity, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Permissions from "expo-permissions";
import { Dimensions } from 'react-native';
import { text } from 'react-native-communications';
import { db } from './src/config';
import { Slider } from 'react-native-range-slider-expo';

//add states for currentPOI_skillLevel, currentPOI_photo, etc. set these to defaults when initiate_addPOI is called.
//create sliders and such and store their data in these variables
//when "submit" button activated, push the contents of these variables to RDB

let pushPOIdata = (skillLevel, accessibility, image, type, lat, lon) => {
  if (pendingPOI_skillLevel && pendingPOI_accessibility && pendingPOI_image && pendingPOI_type && pendingPOI_lat && pendingPOI_lon) { //verify definition of POI props
    db.ref('/poi').push({ //push POI data to directory
      skillLevel: skillLevel,
      accessibility: accessibility,
      image: image,
      type: type,
      lat: lat,
      lon: lon
    });
  } else {
    console.log("undefined POI prop");
  }
};

export default class App extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      APP_WIDTH: Dimensions.get('window').width,
      APP_HEIGHT: Dimensions.get('window').height,
      plusIconDimensions: 144, //height/width of the plus icon in pixels - initialized later - this is fallback value
      darkModeIconDimensions: 57,
      POImenuDimensions: 350,
      bugIconDimensions: 50,
      posColor: '#6cccdc',
      negColor: '#dc6c6c',
      neutralColor: '#041c4b',
      regionState: null, //carries region lat/lon and corresponding deltas
      didMount: false, //tracks component mount status for processes to eliminate memory leakage
      darkModeEnabled: false,
      displayPOImenu: false,
      pendingPOI_skillLevel: null, //null-define unentered POI states
      pendingPOI_accessibility: null,
      pendingPOI_image: null,
      pendingPOI_type: null,
      pendingPOI_condition: null,
      pendingPOI_security: null
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
    this.state.didMount = true; //update state var
    const {status} = await Permissions.askAsync(Permissions.LOCATION); //prompt for location perms

    if (status === "granted") { //verify user response, then begin asynchronous tracking
      this._getLocationAsync();
      console.log("location perms ", status);
    }
  }

  async componentWillUnmount() {this.state.didMount = false;} //update state (checked for in _getLocationAsync)

  initiate_addPOI = () => { //when "add POI" button is pressed, triggers this function
    console.log("setting POI to ", !this.state.displayPOImenu);
    this.state.displayPOImenu = !this.state.displayPOImenu; //flip POI menu display state
    this.state.pendingPOI_skillLevel = null; //set POI states to default
    this.state.pendingPOI_accessibility = null;
    this.state.pendingPOI_image = null;
    this.state.pendingPOI_type = null;
    this.state.pendingPOI_lat = null;
    this.state.pendingPOI_lon = null;
  }

  darkModeSwitch = () => { //enable dark mode if disabled, and vice versa, called when mode button pressed
    console.log("setting dm to ", !this.state.darkModeEnabled);
    this.state.darkModeEnabled = !this.state.darkModeEnabled;
  }

  initBugReport = () => {
    text("17085574833", "Bug Report or Suggestion:\n");
  }

  render() {
    this.state.plusIconDimensions = this.state.APP_WIDTH * .25; //calculate icon dimensions based on app dimensions
    this.state.darkModeIconDimensions = this.state.APP_WIDTH * .15;
    this.state.POImenuDimensions = this.state.APP_WIDTH * .8;
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
    if (this.state.displayPOImenu) { //set POI menu to render only if state variable allows
      POIcond = <Image
                  style = {{
                            position: 'absolute',
                            bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions,
                            left: (this.state.APP_WIDTH - this.state.POImenuDimensions)/2,
                            width: this.state.POImenuDimensions,
                            height: .5 * this.state.APP_HEIGHT,
                            resizeMode: 'contain'
                          }}
                  source = {require('./src/components/POI_menu.png')}
                />
      POIcontent =  <View
                      style = {{
                        position: 'absolute',
                        bottom: this.state.APP_HEIGHT * .04 + this.state.plusIconDimensions,
                        left: (this.state.APP_WIDTH - this.state.POImenuDimensions)/2,
                        width: this.state.POImenuDimensions,
                        height: .5 * this.state.APP_HEIGHT,
                        flexDirection:'row', flexWrap:'wrap'
                      }}
                    >

                      <View //accessibility slider wrapper
                        style = {{paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Slider min={0} max={10} step={1} //accessibility slider
                          valueOnChange={value => {this.state.pendingPOI_accessibility = value}}
                          initialValue={5}
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
                        <Slider min={0} max={10} step={1} //skillLevel slider
                          valueOnChange={value => {this.state.pendingPOI_skillLevel = value}}
                          initialValue={5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                        <Text style = {{alignSelf: 'center', fontWeight: 'bold'}}>Skill Level</Text>
                      </View>

                      <View //security slider wrapper
                        style = {{paddingBottom: this.state.APP_HEIGHT * .03, paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Slider min={0} max={10} step={1} //security slider
                          valueOnChange={value => {this.state.pendingPOI_security = value}}
                          initialValue={5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                        <Text style = {{alignSelf: 'center', fontWeight: 'bold'}}>Security</Text>
                      </View>

                      <View //condition slider wrapper
                        style = {{paddingBottom: this.state.APP_HEIGHT * .03, paddingLeft: this.state.POImenuDimensions * .05, width: this.state.POImenuDimensions * .5, flexDirection: "column"}}
                      >
                        <Slider min={0} max={10} step={1} //condition slider
                          valueOnChange={value => {this.state.pendingPOI_condition = value}}
                          initialValue={5}
                          knobColor = {this.state.neutralColor}
                          valueLabelsBackgroundColor = {this.state.neutralColor}
                          inRangeBarColor = {this.state.negColor}
                          outOfRangeBarColor = {this.state.posColor}
                        />
                        <Text style = {{alignSelf: 'center', fontWeight: 'bold'}}>Condition</Text>
                      </View>

                      <Text style = {{alignSelf: 'center', fontWeight: 'bold', paddingLeft: this.state.POImenuDimensions * .05}}>Type:</Text>

                    </View>
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

        <View style = {this.state.darkModeEnabled ? styles.dmheader : styles.header}>

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
                color: this.state.darkModeEnabled ? "#013" : "#ffe",
                fontSize: 11,
                paddingLeft: 13
              }}
            >
              Give a Suggestion/
            </Text>
            <Text
              style = {{
                color: this.state.darkModeEnabled ? "#013" : "#ffe",
                paddingLeft: 27,
                paddingBottom: 10,
                fontSize: 11
              }}
            >
              Report a Bug
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
        </MapView>
        
        {POIcond /*conditionally render POI menu*/}
        {POIcontent}

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
  },

  header: {
    flex: .15,
    backgroundColor: '#041c4b',
    justifyContent: 'flex-end',
    alignItems: 'flex-end'
  },

  dmheader: {
    flex: .15,
    backgroundColor: '#fff',
    justifyContent: 'flex-end',
    alignItems: 'flex-end'
  }
});