import React, { Component } from "react"; //importing necessary libraries
import { StyleSheet, View, Image, TouchableOpacity, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Permissions from "expo-permissions";
import { Dimensions } from 'react-native';

export default class App extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      APP_WIDTH: Dimensions.get('window').width,
      APP_HEIGHT: Dimensions.get('window').height,
      plusIconDimensions: 144, //height/width of the plus icon in pixels
      darkModeIconDimensions: 57,
      regionState: null, //carries region lat/lon and corresponding deltas
      didMount: false, //tracks component mount status for processes to eliminate memory leakage
      darkModeEnabled: false
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
      console.log("location perms granted");
    } else {
      console.log("location perms denied");
    }
  }

  async componentWillUnmount() {
    this.state.didMount = false; //update state (checked for in _getLocationAsync)
  }

  initiate_addPOI = () => {
    console.log("adding POI")
  }

  darkModeSwitch = () => {
    if (this.state.darkModeEnabled) {
      console.log("setting dm to false");
      this.state.darkModeEnabled = false;
    } else {
      console.log("setting dm to true");
      this.state.darkModeEnabled = true;
    }
  }

  render() {
      let markerCond = <Marker //marker condition - checked using ternary expression in render()->return() - displayed if regionState defined
                            coordinate = {this.state.regionState}
                            image = {require('./src/components/board.png')}
                            flat = {true}
                        />
      let defaultMapStyle = [] //////////////////////////////////CREATING MAP STYLES////////////////////////////////////////
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
        </View>

        <MapView
          provider = {MapView.PROVIDER_GOOGLE}
          initialRegion = {this.state.regionState}
          zoomEnabled
          zoomTapEnabled
          showsCompass
          style = {{flex: 1}}
          customMapStyle = {this.state.darkModeEnabled ? darkMapStyle : defaultMapStyle} //////////////TERNARY TO DETERMINE MAP STYLE/////////////
        >
          {this.state.regionState ? markerCond : null /*conditionally render the markerCond dependent upon the definition status of regionState*/}
        </MapView>

        <TouchableOpacity onPress = {this.initiate_addPOI}>
          <Image  //"add POI" button
            style = {{
              position: 'absolute', //positioned absolutely to play nice with map
              bottom: .04  * this.state.APP_HEIGHT,
              left: (this.state.APP_WIDTH - this.state.plusIconDimensions)/2
            }}
            source = {this.state.darkModeEnabled ? require('./src/components/dmplus.png') : require('./src/components/plus.png')}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress = {this.darkModeSwitch}>
          <Image  //"mode" button
            style = {{
              position: 'absolute', //positioned absolutely to play nice with map
              bottom: .045  * this.state.APP_HEIGHT,
              left: (this.state.APP_WIDTH - this.state.darkModeIconDimensions) / 2 + .25 * this.state.APP_WIDTH
            }}
            source = {this.state.darkModeEnabled ? require('./src/components/lm.png') : require('./src/components/dm.png')}
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
    backgroundColor: "#013"
  },

  dmheader: {
    flex: .15,
    backgroundColor: "#ffe"
  }
});