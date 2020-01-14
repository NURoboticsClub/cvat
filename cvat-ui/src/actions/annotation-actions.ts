import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import {
    CombinedState,
    Task,
} from '../reducers/interfaces';

import getCore from '../core';
import { getCVATStore } from '../store';

const cvat = getCore();

export enum AnnotationActionTypes {
    GET_JOB = 'GET_JOB',
    GET_JOB_SUCCESS = 'GET_JOB_SUCCESS',
    GET_JOB_FAILED = 'GET_JOB_FAILED',
    CHANGE_FRAME = 'CHANGE_FRAME',
    CHANGE_FRAME_SUCCESS = 'CHANGE_FRAME_SUCCESS',
    CHANGE_FRAME_FAILED = 'CHANGE_FRAME_FAILED',
    SAVE_ANNOTATIONS = 'SAVE_ANNOTATIONS',
    SAVE_ANNOTATIONS_SUCCESS = 'SAVE_ANNOTATIONS_SUCCESS',
    SAVE_ANNOTATIONS_FAILED = 'SAVE_ANNOTATIONS_FAILED',
    SAVE_ANNOTATIONS_UPDATED_STATUS = 'SAVE_ANNOTATIONS_UPDATED_STATUS',
    SWITCH_PLAY = 'SWITCH_PLAY',
    CONFIRM_CANVAS_READY = 'CONFIRM_CANVAS_READY',
    DRAG_CANVAS = 'DRAG_CANVAS',
    ZOOM_CANVAS = 'ZOOM_CANVAS',
    RESET_CANVAS = 'RESET_CANVAS',
}

export function switchPlay(playing: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_PLAY,
        payload: {
            playing,
        },
    };
}

export function changeFrameAsync(toFrame: number, playing: boolean):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const store = getCVATStore();
        const state: CombinedState = store.getState();
        const { jobInstance } = state.annotation;
        const currentFrame = state.annotation.frame;

        const frame = Math.max(
            Math.min(toFrame, jobInstance.stopFrame),
            jobInstance.startFrame,
        );

        // !playing || state.annotation.playing prevents changing frame on the latest setTimeout
        // after playing had become false
        if (frame !== currentFrame && (!playing || state.annotation.playing)) {
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME,
                payload: {},
            });

            try {
                const frameData = await jobInstance.frames.get(frame);
                const annotations = await jobInstance.annotations.get(frame);
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                    payload: {
                        frame,
                        frameData,
                        annotations,
                    },
                });
            } catch (error) {
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_FAILED,
                    payload: {
                        frame,
                        error,
                    },
                });
            }
        }
    };
}

export function dragCanvas(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.DRAG_CANVAS,
        payload: {
            enabled,
        },
    };
}

export function zoomCanvas(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.ZOOM_CANVAS,
        payload: {
            enabled,
        },
    };
}

export function resetCanvas(): AnyAction {
    return {
        type: AnnotationActionTypes.RESET_CANVAS,
        payload: {},
    };
}

export function confirmCanvasReady(): AnyAction {
    return {
        type: AnnotationActionTypes.CONFIRM_CANVAS_READY,
        payload: {},
    };
}

export function getJobAsync(tid: number, jid: number):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch({
            type: AnnotationActionTypes.GET_JOB,
            payload: {},
        });

        try {
            const store = getCVATStore();
            const state: CombinedState = store.getState();
            let task = state.tasks.current
                .filter((_task: Task) => _task.instance.id === tid)
                .map((_task: Task) => _task.instance)[0];
            if (!task) {
                [task] = await cvat.tasks.get({ id: tid });
            }

            const job = task.jobs
                .filter((_job: any) => _job.id === jid)[0];
            if (!job) {
                throw new Error('Job with specified id does not exist');
            }

            const frame = Math.min(0, job.startFrame);
            const frameData = await job.frames.get(frame);
            const annotations = await job.annotations.get(frame);

            dispatch({
                type: AnnotationActionTypes.GET_JOB_SUCCESS,
                payload: {
                    jobInstance: job,
                    frameData,
                    annotations,
                    frame,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.GET_JOB_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function saveAnnotationsAsync(sessionInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch({
            type: AnnotationActionTypes.SAVE_ANNOTATIONS,
            payload: {},
        });

        try {
            await sessionInstance.annotations.save((status: string) => {
                dispatch({
                    type: AnnotationActionTypes.SAVE_ANNOTATIONS_UPDATED_STATUS,
                    payload: {
                        status,
                    },
                });
            });

            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS,
                payload: {},
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}
