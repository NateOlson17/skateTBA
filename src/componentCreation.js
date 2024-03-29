// @flow

import { View, Text, Image, Animated, TouchableOpacity } from 'react-native';
import React from "react";
import RangeSlider, { Slider } from 'react-native-range-slider-expo';
import { styles } from './styles'
import { POI_MENU_DIM, NEUTRAL_COLOR, POS_COLOR, NEG_COLOR } from './constants';
import CircleCheckBox, { LABEL_POSITION } from 'react-native-circle-checkbox';

export const createSlider = (onChange: (any) => void, title: string): React$Element<typeof View> => (
    <View style = {{paddingLeft: POI_MENU_DIM * .05, width: POI_MENU_DIM * .5}}>
        <Text allowFontScaling = {false} style = {{alignSelf: 'center', fontWeight: 'bold'}}>{title}</Text>
        <Slider min = {0} max = {10} step = {1} 
            valueOnChange = {onChange}
            initialValue = {5}
            knobColor = {NEUTRAL_COLOR}
            valueLabelsBackgroundColor = {NEUTRAL_COLOR}
            inRangeBarColor = {NEG_COLOR}
            outOfRangeBarColor = {POS_COLOR}
        />
    </View>
)

export const createRatingBar = (rating: number, textString: string, animationObj: Animated.Value, paddingLeft: number): React$Element<typeof View> => (
    <View style = {{flexDirection: 'row', paddingLeft: paddingLeft}}>
        <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>{textString}</Text>
        <View style = {{paddingLeft: 10}}>
        <Image source = {require('./components/rating_displayBar.png')} style = {styles.displayBar}/>
        <Animated.Image
            source = {require('./components/POIdisplay_indicator.png')} 
            style = {{resizeMode: 'contain', width: 10, height: 10, marginLeft: rating === 0 ? 1 : animationObj}}
        />
        </View>
        <Text allowFontScaling = {false} style = {{fontWeight: 'bold', paddingLeft: 5}}> {rating.toFixed(1)}</Text>
    </View>
)

export const createCurrentPOIAction = (action: () => (void | Promise<void>) , size: number, marginLeft: number, imageReq: string): React$Element<typeof TouchableOpacity> => (
    <TouchableOpacity onPress = {action}>
        <Image
            source = {imageReq}
            style = {{resizeMode: 'contain', height: size, width: size, marginLeft: marginLeft}}
        />
    </TouchableOpacity>
)


export const createRangeSlider = (titleString: string, fromFunc: () => void, toFunc: () => void, fromVal: number, toVal: number): React$Element<typeof View> => (
    <View style = {styles.rangeSliderWrap}>
        <Text allowFontScaling = {false} style = {{fontWeight: 'bold'}}>{titleString}</Text>
        <RangeSlider min = {0} max = {10} styleSize = 'small'
        fromValueOnChange = {fromFunc}
        toValueOnChange = {toFunc}
        initialFromValue = {fromVal} initialToValue = {toVal}
        
        fromKnobColor = {NEUTRAL_COLOR} toKnobColor = {NEUTRAL_COLOR}
        inRangeBarColor = {POS_COLOR} outOfRangeBarColor = {NEG_COLOR}
        />
    </View>
)

export const createCheckbox = (label: string, onCheck: () => void, checked: boolean): React$Element<typeof CircleCheckBox> => (
    <CircleCheckBox
        styleCheckboxContainer = {{paddingLeft: 20}}
        allowFontScaling = {false}
        checked = {checked}
        onToggle = {onCheck}
        label = {label}
        labelPosition={LABEL_POSITION.LEFT}
        styleLabel = {{fontWeight: 'bold'}}
        outerColor = {POS_COLOR}
        innerColor = {POS_COLOR}
    />
)