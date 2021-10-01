import { StyleSheet } from 'react-native';
import { FRAME_HEIGHT, FRAME_WIDTH, POI_MENU_DIM, PLUS_ICON_DIM, DM_ICON_DIM } from './constants';

export const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#fff"
    },

    displayBar: {
        resizeMode: 'contain', 
        width: 100, 
        flexBasis: 20
    },

    POIexit_generic: {
        resizeMode: 'contain', 
        height: FRAME_WIDTH * .07, 
        width: FRAME_WIDTH * .07
    },

    POIdisplayBG: {
        resizeMode: 'contain', 
        position: 'absolute',  
        height: 200, 
        width: FRAME_WIDTH
    },

    POIexit_TO: {
        position: 'absolute', 
        top: 20,
        right: 20, 
        width: FRAME_WIDTH * .07, 
        zIndex: 5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 8
    },

    POIdisplayAdditionalMenu_ContentWrapper: {
        position: 'absolute', 
        width: FRAME_WIDTH, 
        height: 200, 
        bottom: FRAME_HEIGHT * .04 + PLUS_ICON_DIM + 210, 
        justifyContent: 'center', 
        alignContent: 'center',
        backgroundColor: 'white',
        borderRadius: 40
    },

    FlatListPerImg: {
        zIndex: 5, 
        height: 140, 
        width: 140, 
        resizeMode: 'contain', 
        alignSelf: 'center', 
        marginRight: 15
    },

    fullScreenImgView: {
        zIndex: 8, 
        position: 'absolute', 
        width: FRAME_WIDTH, 
        height: FRAME_HEIGHT, 
        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
        justifyContent: 'center', 
        alignContent: 'center'
    },

    gestureBar: {
        width: FRAME_WIDTH * .6, 
        height: 3,
        position: 'absolute', 
        left: FRAME_WIDTH * .2, 
        top: 7, 
        opacity: .3,
        backgroundColor: 'gray',
        borderRadius: 20
    },

    POIAdditionWrapper: {
        position: 'absolute',
        left: (FRAME_WIDTH - POI_MENU_DIM)/2,
        width: POI_MENU_DIM,
        height: 452,
        flexDirection: 'row', 
        flexWrap: 'wrap',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15
    },

    POIAdditionBG: {
        position: 'absolute',
        width: POI_MENU_DIM,
        height: 452,
        resizeMode: 'stretch',
        bottom: 10
    },

    currentPOIWrapper: {
        position: 'absolute',
        height: 210,
        width: FRAME_WIDTH,
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 40,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15
    },

    POIimagesWrapper: {
        position: 'absolute',
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        zIndex: 0,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15
    },

    POIcommentsWrapper: {
        position: 'absolute',
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15
    },

    bugReportImg: {
        height: FRAME_WIDTH * .1,
        width: FRAME_WIDTH * .1,
        resizeMode: 'contain',
        paddingRight: FRAME_HEIGHT <= 667 ? 5 : FRAME_WIDTH * .3
    },

    addPOIplus: {
        position: 'absolute',
        bottom: .04  * FRAME_HEIGHT,
        left: (FRAME_WIDTH - PLUS_ICON_DIM) / 2,
        height: PLUS_ICON_DIM,
        width: PLUS_ICON_DIM,
        resizeMode: 'contain'
    },

    DMswitch: {
        position: 'absolute',
        bottom: .04  * FRAME_HEIGHT,
        left: (FRAME_WIDTH - DM_ICON_DIM) / 2 + .25 * FRAME_WIDTH,
        height: DM_ICON_DIM,
        width: DM_ICON_DIM,
        resizeMode: 'contain'
    },

    filterMenuAnimWrap: {
        height: 300, 
        backgroundColor: 'white', 
        borderRadius: 40, 
        width: FRAME_WIDTH, 
        position: 'absolute', 
        flexDirection: 'row', 
        flexWrap: 'wrap',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15
    },

    rangeSliderWrap: {
        width: FRAME_WIDTH / 2,
        alignItems: 'center',
        marginTop: 10
    },

    submitPOIbutton: {
        position: 'absolute', 
        top: 300, 
        right: 20, 
        width: POI_MENU_DIM * .2, 
        height: POI_MENU_DIM * .2
    },

    commentActionButtons: {
        position: 'absolute', 
        height: FRAME_WIDTH * .07, 
        width: FRAME_WIDTH * .07, 
        top: 60
    },

    POIdisplay: {
        position: 'absolute',
        left: (FRAME_WIDTH - POI_MENU_DIM)/2 + 160, 
        height: 31, 
        width: 150, 
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 15
    },

   showFiltersButton: {
       position: 'absolute',
       bottom: FRAME_HEIGHT * .04 + 20,
       left: (FRAME_WIDTH - 40) / 2 - FRAME_WIDTH * .25,
       width: 40,
       height: 40
   },

   secondaryRatingPanel: {
       backgroundColor: 'white', 
       borderRadius: 40, 
       width: POI_MENU_DIM, 
       height: 375, 
       position: 'absolute', 
       left: (FRAME_WIDTH - POI_MENU_DIM)/2,
       flexDirection: 'row',
       flexWrap: 'wrap',
       shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15
    },

    rateSpotButton: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 15
    }
});