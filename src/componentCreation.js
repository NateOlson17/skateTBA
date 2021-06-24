import { View, Text, Image, Animated, TouchableOpacity } from 'react-native';
import React from "react";
import { Slider } from 'react-native-range-slider-expo';
import { styles } from './styles.js'
import { POI_MENU_DIM, NEUTRAL_COLOR, POS_COLOR, NEG_COLOR } from './constants.js';

export const createSlider = (onChange, initVal, title) => (

    <View style = {{paddingLeft: POI_MENU_DIM * .05, width: POI_MENU_DIM * .5}}>
        <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold'}}>{title}</Text>
        <Slider min = {0} max = {10} step = {1} //accessibility slider
            valueOnChange = {onChange}
            initialValue = {initVal}
            knobColor = {NEUTRAL_COLOR}
            valueLabelsBackgroundColor = {NEUTRAL_COLOR}
            inRangeBarColor = {NEG_COLOR}
            outOfRangeBarColor = {POS_COLOR}
        />
    </View>
)

export const createRatingBar = (poi_obj, typeString, textString, animationObj, paddingLeft) => (
    <View style = {{flexDirection: 'row', paddingLeft: paddingLeft}}>
        <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>{textString}</Text>
        <View style = {{paddingLeft: 10}}>
        <Image source = {require('./components/rating_displayBar.png')} style = {styles.displayBar}/>
        <Animated.Image
            source = {require('./components/POIdisplay_indicator.png')} 
            style = {{resizeMode: 'contain', width: 10, height: 10, marginLeft: poi_obj[typeString] === 0 ? 1 : animationObj}}
        />
        </View>
        <Text allowFontScaling = {false} style = {{fontWeight: 'bold', paddingLeft: 5}}> ({poi_obj[typeString]})</Text>
    </View>
)

export const createCurrentPOIAction = (action, size, marginLeft, imageReq) => (
    <TouchableOpacity onPress = {action}>
        <Image
            source = {imageReq}
            style = {{resizeMode: 'contain', height: size, width: size, marginLeft: marginLeft}}
        />
    </TouchableOpacity>
)