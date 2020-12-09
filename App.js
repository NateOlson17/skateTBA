import React, { Component } from "react"; //importing necessary libraries
import { StyleSheet, View } from "react-native";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import * as Permissions from "expo-permissions";

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      regionState: null, //carries region lat/lon and corresponding deltas
      didMount: false //tracks component mount status for processes to eliminate memory leakage
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

  render() {
    return (
      <View style={styles.container}>
        <MapView
          initialRegion = {this.state.regionState}
          showsCompass = {true}
          showsUserLocation = {true}
          rotateEnabled = {true}
          style = {{flex: 1}}
        />
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