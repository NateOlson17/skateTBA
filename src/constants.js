// @flow

import { Dimensions, Alert } from 'react-native';
import Clipboard from 'expo-clipboard';
import * as ImageManipulator from 'expo-image-manipulator';


export const darkMapStyle = [ //generate dark map style (stored locally)
    {"elementType": "geometry", "stylers": [{"color": "#242f3e"}]},
    {"elementType": "labels.text.fill", "stylers": [{"color": "#746855"}]},
    {"elementType": "labels.text.stroke", "stylers": [{"color": "#242f3e"}]},
    {"featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{"color": "#d59563"}]},
    {"featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#d59563"}]},
    {"featureType": "poi.park", "elementType": "geometry", "stylers": [{"color": "#263c3f"}]},
    {"featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{"color": "#6b9a76"}]},
    {"featureType": "road", "elementType": "geometry", "stylers": [{"color": "#38414e"}]},
    {"featureType": "road", "elementType": "geometry.stroke", "stylers": [{"color": "#212a37"}]},
    {"featureType": "road", "elementType": "labels.text.fill", "stylers": [{"color": "#9ca5b3"}]},
    {"featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#746855"}]},
    {"featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{"color": "#1f2835"}]},
    {"featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{"color": "#f3d19c"}]},
    {"featureType": "transit", "elementType": "geometry", "stylers": [{"color": "#2f3948"}]},
    {"featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{"color": "#d59563"}]},
    {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#17263c"}]},
    {"featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#515c6d"}]},
    {"featureType": "water", "elementType": "labels.text.stroke", "stylers": [{"color": "#17263c"}]}
];
  
export const POS_COLOR = '#6cccdc'; export const NEG_COLOR = '#dc6c6c'; export const NEUTRAL_COLOR = '#041c4b';

//dimension reading and proportion fallback determinations
export const FRAME_WIDTH = (Dimensions.get('window').width: number);
export const FRAME_HEIGHT =  (Dimensions.get('window').height: number);
export const PLUS_ICON_DIM = FRAME_WIDTH * .25;
export const DM_ICON_DIM = FRAME_WIDTH * .15;
export const POI_MENU_DIM = 338;

export type PComment = {
    key: string,
    text: string
};

export type PImage = {
    data: string,
    key: string,
    type: string
};

export type RegionState = {
    latitude: number,
    longitude: number
};

export type FilterConstraint = {
    accessibility_max: number,
    accessibility_min: number,
    condition_max: number,
    condition_min: number,
    security_max: number,
    security_min: number,
    skillLevel_max: number,
    skillLevel_min: number
};

export type PointOfInterest = {
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
}

export type User = {
    username: string;
    password: string;
    email: string;
}

export const uriToBase64: ((uripath: string) => Promise<empty>) = async uripath => {
    const result = await ImageManipulator.manipulateAsync(uripath, [], {base64: true, compress: .4, format: ImageManipulator.SaveFormat.JPEG});
    return result.base64;
  };