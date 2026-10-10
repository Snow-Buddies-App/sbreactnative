import React from 'react';
import {View, TextInput as RNTextInput, TextInputProps as RNTextInputProps, Text, StyleSheet } from 'react-native';
import { useController, useFormContext, ControllerProps, UseControllerProps } from 'react-hook-form';

// Custom data type containing props for text input.
interface TextInputProps extends RNTextInputProps, UseControllerProps {
    label: string
    defaultValue?: string
}

// Custom text input component.
const ControlledInput = (props: TextInputProps) => {

    const formContext = useFormContext();
    const { formState } = formContext;

    const {
        name,
        label,
        rules,
        defaultValue,
        ...inputProps
    } = props;

    const { field, fieldState } = useController({ name, rules, defaultValue });

    return (
        <View style={styles.container}>
            {label && (<Text style={styles.label}>{label}</Text>)}
            <View>
                <RNTextInput style={styles.input} 
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                value={field.value}
                {...inputProps} />
            </View>
        </View>
    )
}

// Export text input component with contextual logic.
export const TextInput = (props: TextInputProps) => {

    const { name } = props;

    const formContext = useFormContext();

    if(!formContext || !name) {
        const msg = !formContext ? "TextInput must be wrapped by the FormProvider" : "TextInput must have a name";
        console.error(msg);
        return null;
    }

    return <ControlledInput {...props} />;
}

const styles = StyleSheet.create({
    label: {
        color: 'black',
        margin: 20,
        marginLeft: 0,
    },
    container: {
        flex: -1,
        justifyContent: 'center',
        padding: 8,
        backgroundColor: 'white',
        borderColor: 'white',
        borderWidth: 1,
    },
    input: {
        backgroundColor: 'white',
        borderColor: 'none',
        height: 40,
        padding: 10,
        borderRadius: 4,
    },
});