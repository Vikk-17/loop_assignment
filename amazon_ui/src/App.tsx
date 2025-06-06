import React, { FC, useState } from 'react';
import { ChevronDown, ChevronUp, Star } from "lucide-react";
// import './App.css'


const App = () => {
    // const [isPrime, isSetPrime] = useState<boolean>(false);
    //
    //
    // const handlePrimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     isSetPrime(e.target.checked);
    // }


    return (
        <>
            <FilterComponent title="Amazon Prime">
                {/*checbox*/}
                <CheckBoxComponent 
                    id="prime"
                    label="prime"
                />
            </FilterComponent>
        </>
    )
}


//filter component
type filterComponentItems = {
    title: string;
    children: React.ReactNode;
    isCollapsible?: boolean;
}

const FilterComponent: FC<filterComponentItems> = ({ title, children, isCollapsible = false }) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <div>
            <div
                onClick={() => isCollapsible && setExpanded(!expanded)}
            >
                <h3>{title}</h3>
                {isCollapsible && (
                    expanded? <ChevronUp size={10} />: <ChevronDown size={10} /> 
                )}
            </div>
            <div>{children}</div>
        </div>
    );
};


type checkBoxComponenetItems = {
    id: string;
    label: string;
    disabled?: boolean;
    defaultChecked?: boolean;
}

const CheckBoxComponent: FC<checkBoxComponenetItems> = ({label, id, disabled = false}) => {
    const [isChecked, setIsChecked] = useState(false);
    return (
        <label>
            <input 
                type="checkbox"
                id={id}
                disabled={disabled}
                onChange={e => setIsChecked(e.target.checked)}
                defaultChecked={isChecked}
            />
            {label}
        </label>
    ) 
}

export default App
