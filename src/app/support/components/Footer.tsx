import React from 'react'

export function Footer() {
    return (
        <footer className=" py-4  items-center ">
            <div className="max-w-6xl mx-auto text-center">
                <p className="text-muted-foreground">
                    &copy; {new Date().getFullYear()} Monstro. All rights reserved.
                </p>
            </div>
        </footer>

    )
}
