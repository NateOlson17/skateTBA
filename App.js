import React from 'react';
import MapView from 'react-native-maps';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { //state set
      locationResult: null, //location result holds either location object converted to string or error message as string 
      locationStatus: null, //holds success status of location grab
      initLat_s: 0, //holds initial latitude and longitude of user location
      initLon_s: 0
    }; 
  }
  
  componentDidMount() {this._getLocationAsync();} //if component mounts, run location grabber
    
  _getLocationAsync = async () => { //location grabber
    const { status, permissions } = await Permissions.askAsync(Permissions.LOCATION); //ask for location perms
    if (status !== "granted") { //if location perms denied, set locationResult accordingly
      console.log("location perms denied");
      this.setState({locationResult: "Permission to access location was denied"});
      this.setState({locationStatus: false});
    } else {
      console.log("location perms granted");
      let initLocation = await Location.getCurrentPositionAsync({ enableHighAccuracy: true }); //otherwise, save location object in "location" var
      this.setState({locationResult: JSON.stringify(initLocation)}); //set locationResult to string representation of location
      console.log("stringified locationResult:");
      console.log(this.state.locationResult);
      this.setState({locationStatus: true});

      let initLat = initLocation.coords.latitude; //gather lat/lon from location object
      let initLon = initLocation.coords.longitude;
      this.setState({initLat_s: initLat}); //set lat/lon in state accordingly
      this.setState({initLon_s: initLon});
      console.log("lat:");
      console.log(this.state.initLat_s);
      console.log("lon:");
      console.log(this.state.initLon_s);
    }
  };

  render() {
    return (
      <View style={styles.container}>
        <MapView 
          style={styles.mapStyle}
          region = {{
            latitude: this.state.initLat_s,
            longitude: this.state.initLon_s,
            latitudeDelta: .01,
            longitudeDelta: .01 
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapStyle: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});